import { Logger } from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import type { Permission } from "#modules/auth/permissions";
import { prisma } from "#shared/database/prisma-instance";
import type { AuditRequestContext } from "./audit-context";

const PERMISSION_DENIAL_WINDOW_MS = 5 * 60 * 1000;
const PERMISSION_DENIAL_WARNING_THRESHOLD = 3;
const UNKNOWN_ACTOR_ROLE = "unknown";
const logger = new Logger("PermissionDenialAudit");

type PermissionDenialSession = {
	readonly user: {
		readonly id: string;
		readonly role?: string;
	};
};

type PermissionDenialRequest = {
	readonly auditContext?: AuditRequestContext;
	readonly method?: string;
	readonly path?: string;
	readonly route?: {
		readonly path?: string;
	};
	readonly params?: Record<string, string>;
};

type RecordPermissionDenialInput = {
	readonly req: PermissionDenialRequest;
	readonly session: PermissionDenialSession;
	readonly permission: Permission;
};

const withoutUndefined = (metadata: Record<string, string | undefined>): Record<string, string> =>
	Object.fromEntries(
		Object.entries(metadata).filter((entry): entry is [string, string] => {
			const [, value] = entry;
			return value !== undefined;
		}),
	);

export const recordPermissionDenial = async ({ req, session, permission }: RecordPermissionDenialInput) => {
	await prisma.auditEvent.create({
		data: {
			actorId: session.user.id,
			actorRole: session.user.role ?? UNKNOWN_ACTOR_ROLE,
			action: AUDIT_ACTIONS.permissionDenied,
			targetType: AUDIT_TARGET_TYPES.permission,
			targetId: permission,
			ipAddress: req.auditContext?.ipAddress,
			userAgent: req.auditContext?.userAgent,
			metadata: withoutUndefined({
				correlationId: req.auditContext?.correlationId,
				method: req.method,
				permission,
				routePath: req.route?.path ?? req.path,
				routeParams: req.params ? JSON.stringify(req.params) : undefined,
			}),
		},
	});

	const since = new Date(Date.now() - PERMISSION_DENIAL_WINDOW_MS);
	const denialCount = await prisma.auditEvent.count({
		where: {
			actorId: session.user.id,
			action: AUDIT_ACTIONS.permissionDenied,
			createdAt: { gte: since },
		},
	});

	if (denialCount >= PERMISSION_DENIAL_WARNING_THRESHOLD) {
		logger.warn(`Repeated permission denials detected for actor ${session.user.id}: ${denialCount}`);
	}
};
