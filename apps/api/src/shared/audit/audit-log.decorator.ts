import { SetMetadata } from "@nestjs/common";
import type { AuditAction, AuditTargetType } from "#modules/audit-log/audit-actions";

export const AUDIT_LOG_METADATA_KEY = "wez:audit-log";
export const SKIP_AUDIT_LOG_METADATA_KEY = "wez:skip-audit-log";

export type AuditLogMode = "manual" | "auto";

export type AuditLogMetadata = {
	action: AuditAction | string;
	mode: AuditLogMode;
	targetIdParam?: string;
	targetType?: AuditTargetType | string;
};

export type AuditLogOptions = Omit<AuditLogMetadata, "action" | "mode"> & {
	mode?: AuditLogMode;
};

export const AuditLog = (action: AuditAction | string, options: AuditLogOptions = {}) =>
	SetMetadata(AUDIT_LOG_METADATA_KEY, {
		...options,
		action,
		mode: options.mode ?? "manual",
	} satisfies AuditLogMetadata);

export const SkipAuditLog = () => SetMetadata(SKIP_AUDIT_LOG_METADATA_KEY, true);
