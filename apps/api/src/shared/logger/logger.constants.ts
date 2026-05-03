export const CORRELATION_ID_HEADER = "x-correlation-id" as const;

export const SENSITIVE_FIELDS = [
	"password",
	"secret",
	"token",
	"authorization",
	"creditCard",
	"ssn",
	"refreshToken",
	"accessToken",
] as const;

export const EXCLUDED_ROUTES = ["/api/docs", "/health", "/api/docs-json"] as const;

export const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 200;
