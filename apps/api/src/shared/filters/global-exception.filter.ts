import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";
import { CORRELATION_ID_HEADER } from "#shared/logger/logger.constants";

const DOMAIN_ERROR_MESSAGES: Record<string, string> = {
	ALREADY_FINALIZED: "This request has already been finalized.",
	CASH_DOUBLE_CONFIRMATION_REQUIRED: "Cash payment must be double-confirmed before placement.",
	EMPLOYER_BANNED: "This employer account is restricted.",
	EMPLOYER_ID_REQUIRED: "Employer is required.",
	HIRE_REQUEST_NOT_AWAITING_VISIT: "Only awaiting hire requests can be finalized.",
	INVALID_ROLE: "Selected role is not available.",
	EMPLOYER_NOT_FOUND: "Selected employer was not found.",
	NO_EMPLOYER_PROFILE: "No employer profile is linked to this account.",
	NO_WORKER_PROFILE: "No worker profile is linked to this account.",
	PAYMENT_REQUIRED: "Payment must be confirmed before placement.",
	PERCENT_OUT_OF_RANGE: "Percent commission must be between 0 and 100.",
	PLACEMENT_ALREADY_EXISTS: "A placement already exists for this hire request.",
	ROLE_ID_TAKEN: "This role ID is already used.",
	ROLE_NOT_FOUND: "Selected role was not found.",
	SALARY_OUT_OF_ROLE_RANGE: "Salary is outside the configured role range.",
	SALARY_RANGE_INVALID: "Salary minimum must be less than or equal to salary maximum.",
	STATION_NOT_FOUND: "Selected station was not found.",
	STATION_INACTIVE: "Selected station is not active.",
	WORKER_DOES_NOT_PERFORM_ROLE: "This worker is not registered for the selected role.",
	WORKER_NOT_AVAILABLE: "This worker is not available for new hire requests.",
	WORKER_NOT_FOUND: "Selected worker was not found.",
} as const;

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

		const getResponseObject = (): Record<string, unknown> => {
			if (!(exception instanceof HttpException)) return {};
			const res = exception.getResponse();
			return typeof res === "object" && res !== null ? (res as Record<string, unknown>) : {};
		};

		const responseObject = getResponseObject();
		const domainCode = typeof responseObject.code === "string" ? responseObject.code : undefined;

		const getMessage = (): string => {
			if (domainCode) return DOMAIN_ERROR_MESSAGES[domainCode] ?? domainCode.replaceAll("_", " ").toLowerCase();
			if (!(exception instanceof HttpException)) return "Internal server error";
			const res = exception.getResponse();
			if (typeof res === "string") return res;
			const msg = responseObject.message;
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

		const code = domainCode ?? HttpStatus[status] ?? "INTERNAL_ERROR";

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
		const details = responseObject.details;
		response.status(status).json({
			error: {
				code,
				message,
				...(details !== undefined ? { details } : {}),
			},
		});
	}
}
