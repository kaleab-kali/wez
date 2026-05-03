import { randomUUID } from "node:crypto";
import * as path from "node:path";
import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { EXCLUDED_ROUTES } from "./logger.constants";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? "info" : "debug");
const LOGS_DIR = path.resolve(process.cwd(), "logs");

const buildTransportTargets = () => {
	const targets: Array<{ target: string; level: string; options: Record<string, unknown> }> = [];

	if (IS_PRODUCTION) {
		// Production: JSON to stdout (PM2 captures this)
		targets.push({
			target: "pino/file",
			level: LOG_LEVEL,
			options: { destination: 1 }, // stdout
		});
	} else {
		// Development: pretty-printed to stdout
		targets.push({
			target: "pino-pretty",
			level: LOG_LEVEL,
			options: {
				colorize: true,
				translateTime: "SYS:HH:MM:ss",
				singleLine: false,
				ignore: "pid,hostname",
			},
		});
	}

	// File rotation (both dev and prod)
	targets.push({
		target: "pino-roll",
		level: LOG_LEVEL,
		options: {
			file: path.join(LOGS_DIR, "api"),
			frequency: "daily",
			limit: { count: 14 },
			size: "10m",
			mkdir: true,
		},
	});

	// Telegram alerts (production only, error-level only, only if env vars set)
	if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
		targets.push({
			target: "pino-telegram",
			level: "error",
			options: {
				token: process.env.TELEGRAM_BOT_TOKEN,
				chat: process.env.TELEGRAM_CHAT_ID,
			},
		});
	}

	return targets;
};

@Module({
	imports: [
		PinoLoggerModule.forRoot({
			pinoHttp: {
				level: LOG_LEVEL,
				genReqId: (req) => (req.headers["x-correlation-id"] as string) || randomUUID(),
				transport: {
					targets: buildTransportTargets(),
				},
				autoLogging: {
					ignore: (req) => EXCLUDED_ROUTES.some((route) => req.url?.startsWith(route)),
				},
				customProps: (req) => {
					const r = req as unknown as Record<string, unknown>;
					return {
						correlationId: r.id,
						...(r.organizationId ? { organizationId: r.organizationId } : {}),
					};
				},
				serializers: {
					req: (req) => ({
						id: req.id,
						method: req.method,
						url: req.url,
						query: req.query,
						remoteAddress: req.remoteAddress,
					}),
					res: (res) => ({
						statusCode: res.statusCode,
					}),
				},
			},
			renameContext: "context",
		}),
	],
	exports: [PinoLoggerModule],
})
export class LoggerModule {}
