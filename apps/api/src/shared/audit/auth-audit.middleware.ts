import type { NextFunction, Request, Response } from "express";
import {
	type AuthAuditRealm,
	authAuditActions,
	isAuthSignInPath,
	isAuthSignOutPath,
	recordAuthAuditEvent,
} from "#shared/audit/auth-audit";
import type { WezSession } from "#shared/auth/session";

type AuthAuditSessionResolver = (req: Request) => Promise<WezSession | null>;

type AuthAuditMiddlewareOptions = {
	readonly realm: AuthAuditRealm;
	readonly basePath: string;
	readonly resolveSession: AuthAuditSessionResolver;
};

const CLIENT_ERROR_STATUS = 400;

const auditPath = (originalUrl: string, basePath: string): string => {
	const pathname = new URL(originalUrl, "http://wez.local").pathname;
	return pathname.startsWith(basePath) ? pathname.slice(basePath.length) || "/" : pathname;
};

export const createAuthAuditMiddleware =
	(options: AuthAuditMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => {
		const path = auditPath(req.originalUrl, options.basePath);
		const sessionBeforeRequest = isAuthSignOutPath(path) ? options.resolveSession(req) : Promise.resolve(null);

		res.on("finish", () => {
			void (async () => {
				if (isAuthSignInPath(path) && res.statusCode >= CLIENT_ERROR_STATUS) {
					await recordAuthAuditEvent({
						action: authAuditActions.failedLogin,
						realm: options.realm,
						headers: req.headers,
						statusCode: res.statusCode,
						path,
						method: req.method,
					});
					return;
				}
				if (isAuthSignOutPath(path) && res.statusCode < CLIENT_ERROR_STATUS) {
					const session = await sessionBeforeRequest;
					await recordAuthAuditEvent({
						action: authAuditActions.logout,
						realm: options.realm,
						headers: req.headers,
						userId: session?.user.id,
						actorRole: session?.user.role ?? options.realm,
						statusCode: res.statusCode,
						path,
						method: req.method,
					});
				}
			})().catch(() => undefined);
		});

		next();
	};
