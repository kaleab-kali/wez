import { createAuthMiddleware } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth/types";
import {
	type AuthAuditRealm,
	authAuditActions,
	isAuthSignInPath,
	recordAuthAuditEvent,
} from "#shared/audit/auth-audit";

type SessionUser = {
	readonly id: string;
	readonly role?: string | null;
};

export const authAuditPlugin = (realm: AuthAuditRealm): BetterAuthPlugin => ({
	id: `wez-auth-audit-${realm}`,
	hooks: {
		after: [
			{
				matcher: (context) => isAuthSignInPath(context.path ?? ""),
				handler: createAuthMiddleware(async (context) => {
					const user = context.context.newSession?.user as SessionUser | undefined;
					if (!user) return;
					try {
						await recordAuthAuditEvent({
							action: authAuditActions.login,
							realm,
							headers: Object.fromEntries(context.headers?.entries() ?? []),
							userId: user.id,
							actorRole: user.role ?? realm,
							path: context.path,
						});
					} catch {
						return;
					}
				}),
			},
		],
	},
});
