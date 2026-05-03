import { SENSITIVE_FIELDS } from "./logger.constants";

export const redactSensitiveFields = (obj: unknown): unknown => {
	if (obj === null || obj === undefined) return obj;
	if (typeof obj !== "object") return obj;
	if (Array.isArray(obj)) return obj.map(redactSensitiveFields);

	const redacted: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const isFieldSensitive = SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()));
		redacted[key] = isFieldSensitive ? "[REDACTED]" : redactSensitiveFields(value);
	}
	return redacted;
};
