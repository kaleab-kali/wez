import * as path from "node:path";
import { RequestMethod, ValidationPipe, VERSION_NEUTRAL, VersioningType } from "@nestjs/common";

// Serialize BigInt as string in all JSON responses (Wez money columns).
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
	return this.toString();
};
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { toNodeHandler } from "better-auth/node";
import * as compression from "compression";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { AppModule } from "./app.module";

const _MAX_BODY_SIZE = "10mb";

const bootstrap = async () => {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: false, // Required for Better Auth
		bufferLogs: true, // Buffer logs until Pino is ready
	});

	// Use Pino as the application logger
	const logger = app.get(Logger);
	app.useLogger(logger);

	// Graceful shutdown
	app.enableShutdownHooks();

	// Cookie parsing
	app.use(cookieParser());

	// Serve uploaded files statically
	app.useStaticAssets(path.resolve(process.cwd(), "uploads"), {
		prefix: "/uploads/",
		index: false,
	});

	// Admin auth routes (separate Better Auth instance)
	// Mounted here so Better Auth handles its own cookie/session lifecycle.
	// Only /api/admin-auth/* routes are handled — all other routes pass through to NestJS.
	const adminHandler = toNodeHandler(adminAuth);
	app.use("/api/admin-auth", (req: any, res: any, next: () => void) => {
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
	if (process.env.NODE_ENV !== "production") {
		const config = new DocumentBuilder()
			.setTitle("Wez API")
			.setDescription("Wez worker placement platform — single-tenant API")
			.setVersion("1.0")
			.addCookieAuth("better-auth.session_token")
			.build();
		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup("api/docs", app, document);
	}

	const port = process.env.API_PORT || 3000;
	const host = process.env.API_HOST || "0.0.0.0";
	await app.listen(port, host);

	logger.log(`API running on http://${host}:${port}`);
	logger.log(`Environment: ${process.env.NODE_ENV || "development"}`);
	if (process.env.NODE_ENV !== "production") {
		logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
	}
};
bootstrap();
