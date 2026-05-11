import type { IncomingHttpHeaders } from "node:http";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, type AuditAction } from "#modules/audit-log/audit-actions";
import { buildAuditRequestContext } from "#shared/audit/audit-context";
import { prisma } from "#shared/database/prisma-instance";

export type AuthAuditRealm = "customer" | "staff";

type AuthAuditInput = {
	readonly action: AuditAction;
	readonly realm: AuthAuditRealm;
	readonly headers?: IncomingHttpHeaders;
	readonly userId?: string | null;
	readonly actorRole?: string | null;
	readonly statusCode?: number;
	readonly path?: string;
	readonly method?: string;
};

const fallbackActorRole = (realm: AuthAuditRealm) => `${realm}_auth`;
const metadataFromInput = (input: AuthAuditInput, context: ReturnType<typeof buildAuditRequestContext> | undefined) =>
	Object.fromEntries(
		[
			["realm", input.realm],
			["path", input.path],
			["method", input.method],
			["statusCode", input.statusCode],
			["correlationId", context?.correlationId],
		].filter((entry): entry is [string, string | number] => entry[1] !== undefined),
	);

export const recordAuthAuditEvent = async (input: AuthAuditInput): Promise<void> => {
	const context = input.headers ? buildAuditRequestContext(input.headers) : undefined;
	await prisma.auditEvent.create({
		data: {
			actorId: input.userId,
			actorRole: input.actorRole ?? fallbackActorRole(input.realm),
			action: input.action,
			targetType: AUDIT_TARGET_TYPES.auth,
			targetId: input.userId ?? undefined,
			ipAddress: context?.ipAddress,
			userAgent: context?.userAgent,
			metadata: metadataFromInput(input, context),
		},
	});
};

export const isAuthSignInPath = (path: string): boolean =>
	path === "/sign-in/email" || path === "/sign-in/phone-number" || path === "/phone-number/verify";

export const isAuthSignOutPath = (path: string): boolean => path === "/sign-out";

export const authAuditActions = {
	login: AUDIT_ACTIONS.authLogin,
	logout: AUDIT_ACTIONS.authLogout,
	failedLogin: AUDIT_ACTIONS.authFailedLogin,
} as const;
