import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";
import { CORRELATION_ID_HEADER } from "#shared/logger/logger.constants";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(GlobalExceptionFilter.name);
	}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

		const getMessage = (): string => {
			if (!(exception instanceof HttpException)) return "Internal server error";
			const res = exception.getResponse();
			if (typeof res === "string") return res;
			const resObj = res as Record<string, unknown>;
			const msg = resObj.message;
			if (Array.isArray(msg)) return msg.join(", ");
			if (typeof msg === "string") return msg;
			return "Internal server error";
		};

		// Sanitize message to strip internal path/method info (security).
		const sanitize = (raw: string): string => {
			// NestJS default 404: "Cannot POST /api/v1/foo" — replace with generic.
			if (/^Cannot\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\//i.test(raw)) {
				return "Resource not found";
			}
			// Strip any URL-like fragments from message.
			return raw.replace(/\/api\/v\d+\/[^\s"]+/g, "").trim() || "Request failed";
		};
		const message = sanitize(getMessage());

		const code = HttpStatus[status] || "INTERNAL_ERROR";

		const logPayload = {
			statusCode: status,
			path: request.url,
			method: request.method,
			correlationId: request.headers[CORRELATION_ID_HEADER],
			...(exception instanceof Error ? { err: exception } : {}),
		};

		if (status >= 500) {
			this.logger.error(logPayload, `${code}: ${message}`);
		} else {
			this.logger.warn(logPayload, `${code}: ${message}`);
		}

		// Never leak stack traces, endpoint paths, DB schema, or internal details to clients.
		// Full details go to server logs only (logPayload above).
		response.status(status).json({
			error: { code, message },
		});
	}
}
