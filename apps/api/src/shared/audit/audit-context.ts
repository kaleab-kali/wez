import type { IncomingHttpHeaders } from "node:http";
import { CORRELATION_ID_HEADER } from "#shared/logger/logger.constants";

export type AuditRequestContext = {
	ipAddress?: string;
	userAgent?: string;
	correlationId?: string;
};

declare global {
	namespace Express {
		interface Request {
			auditContext?: AuditRequestContext;
		}
	}
}

const firstHeaderValue = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value;

export const buildAuditRequestContext = (headers: IncomingHttpHeaders): AuditRequestContext => ({
	ipAddress: firstHeaderValue(headers["x-forwarded-for"])?.split(",")[0]?.trim(),
	userAgent: firstHeaderValue(headers["user-agent"]),
	correlationId: firstHeaderValue(headers[CORRELATION_ID_HEADER]),
});
