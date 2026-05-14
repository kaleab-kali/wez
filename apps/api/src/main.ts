import { existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import { RequestMethod, ValidationPipe, VERSION_NEUTRAL, VersioningType } from "@nestjs/common";

// Serialize BigInt as string in all JSON responses (Wez money columns).
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
	return this.toString();
};

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import * as compression from "compression";
import * as cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { auth } from "#modules/auth/auth.config";
import { createAuthAuditMiddleware } from "#shared/audit/auth-audit.middleware";
import { AppModule } from "./app.module";

const _MAX_BODY_SIZE = "10mb";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEFAULT_STORAGE_ROOT = path.resolve(process.cwd(), "uploads");
const FRONTEND_DIST_CANDIDATES = [
	() => process.env.FRONTEND_DIST_DIR,
	() => path.resolve(process.cwd(), "apps", "web", "dist"),
	() => path.resolve(process.cwd(), "..", "web", "dist"),
] as const;
const SPA_BYPASS_PREFIXES = ["/api", "/health", "/socket.io", "/uploads"] as const;
const REQUIRED_PRODUCTION_ENV = [
	"DATABASE_URL",
	"BETTER_AUTH_SECRET",
	"ADMIN_AUTH_SECRET",
	"BETTER_AUTH_URL",
	"FRONTEND_URL",
] as const;

type AuthAuditUser = {
	readonly id: string;
	readonly role?: string | null;
};

const toAuditSessionUser = (user: AuthAuditUser) => ({ id: user.id, role: user.role ?? undefined });

const existingFrontendDist = (): string | null => {
	const candidates = FRONTEND_DIST_CANDIDATES.map((candidate) => candidate())
		.filter((candidate): candidate is string => Boolean(candidate))
		.map((candidate) => path.resolve(candidate));
	return candidates.find((candidate) => existsSync(path.join(candidate, "index.html"))) ?? null;
};

const validateProductionEnv = () => {
	if (!IS_PRODUCTION) return;
	const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !process.env[key]);
	if (missing.length > 0) {
		throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
	}
};

const shouldBypassSpa = (req: Request) =>
	req.method !== "GET" ||
	SPA_BYPASS_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));

const configureStaticAssets = (app: NestExpressApplication) => {
	const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? DEFAULT_STORAGE_ROOT);
	mkdirSync(storageRoot, { recursive: true });
	app.useStaticAssets(storageRoot, { prefix: "/uploads", index: false });

	if (!IS_PRODUCTION && process.env.SERVE_WEB_APP !== "true") return;
	const frontendDist = existingFrontendDist();
	if (!frontendDist) return;
	app.useStaticAssets(frontendDist, { index: false });
	app.use((req: Request, res: Response, next: NextFunction) => {
		if (shouldBypassSpa(req)) {
			next();
			return;
		}
		res.sendFile(path.join(frontendDist, "index.html"));
	});
};

const bootstrap = async () => {
	validateProductionEnv();
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: false, // Required for Better Auth
		bufferLogs: true, // Buffer logs until Pino is ready
	});
	if (IS_PRODUCTION) app.set("trust proxy", 1);

	// Use Pino as the application logger
	const logger = app.get(Logger);
	app.useLogger(logger);

	// Graceful shutdown
	app.enableShutdownHooks();

	// Cookie parsing
	app.use(cookieParser());

	app.use(
		"/api/auth",
		createAuthAuditMiddleware({
			realm: "customer",
			basePath: "/api/auth",
			resolveSession: async (req) => {
				const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
				if (!session?.user) return null;
				return {
					kind: "customer",
					user: toAuditSessionUser(session.user as AuthAuditUser),
					session: session.session as { id: string; token: string },
				};
			},
		}),
	);
	app.use(
		"/api/admin-auth",
		createAuthAuditMiddleware({
			realm: "staff",
			basePath: "/api/admin-auth",
			resolveSession: async (req) => {
				const session = await adminAuth.api.getSession({ headers: fromNodeHeaders(req.headers) });
				if (!session?.user) return null;
				return {
					kind: "staff",
					user: toAuditSessionUser(session.user as AuthAuditUser),
					session: session.session as { id: string; token: string },
				};
			},
		}),
	);

	// Admin auth routes (separate Better Auth instance)
	// Mounted here so Better Auth handles its own cookie/session lifecycle.
	// Only /api/admin-auth/* routes are handled — all other routes pass through to NestJS.
	const adminHandler = toNodeHandler(adminAuth);
	app.use("/api/admin-auth", (req: Request, res: Response, next: NextFunction) => {
		adminHandler(req, res).catch(next);
	});

	// Security
	app.use(helmet());

	// Compression
	app.use(compression());

	// CORS
	app.enableCors({
		origin: process.env.FRONTEND_URL || "http://localhost:5180",
		credentials: true,
		maxAge: 86400, // 24 hours preflight cache
	});
	configureStaticAssets(app);

	// Global prefix for all routes except auth and health
	app.setGlobalPrefix("api/v1", {
		exclude: [
			{ path: "api/auth/*path", method: RequestMethod.ALL },
			{ path: "health", method: RequestMethod.GET },
		],
	});
	// URI versioning — controllers can @Controller({ version: "2", path: "..." }) for new versions.
	// Existing controllers use the static "v1" path prefix above; versioning opt-in for future breaks.
	app.enableVersioning({
		type: VersioningType.URI,
		prefix: false,
		defaultVersion: VERSION_NEUTRAL,
	});

	// Validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: { enableImplicitConversion: true },
		}),
	);

	// Swagger (development only)
	if (!IS_PRODUCTION) {
		const config = new DocumentBuilder()
			.setTitle("Wez API")
			.setDescription("Wez worker placement platform — single-tenant API")
			.setVersion("1.0")
			.addCookieAuth("better-auth.session_token")
			.build();
		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup("api/docs", app, document);
	}

	const port = process.env.PORT || process.env.API_PORT || 3000;
	const host = process.env.API_HOST || "0.0.0.0";
	await app.listen(port, host);

	logger.log(`API running on http://${host}:${port}`);
	logger.log(`Environment: ${process.env.NODE_ENV || "development"}`);
	if (!IS_PRODUCTION) {
		logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
	}
};
bootstrap();
