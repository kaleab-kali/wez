import type { IncomingHttpHeaders } from "node:http";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { auth } from "#modules/auth/auth.config";
import { hasPermission, type Permission } from "#modules/auth/permissions";
import { prisma } from "#shared/database/prisma-instance";

type AuthUser = {
	id: string;
	email?: string | null;
	name?: string;
	role?: string;
};

type AuthSession = {
	id: string;
	token: string;
};

export type WezSession = {
	kind: "staff" | "customer";
	user: AuthUser;
	session: AuthSession;
};

export type WezRequest = {
	headers: IncomingHttpHeaders;
	wezSession?: WezSession | null;
};

/**
 * Resolve the current request to either a staff (admin Better Auth) or
 * customer (tenant Better Auth) session. Tries staff first since they have
 * stricter cookies + tend to make more API calls.
 */
export const getSession = async (req: WezRequest): Promise<WezSession | null> => {
	const headers = fromNodeHeaders(req.headers);
	const staff = await adminAuth.api.getSession({ headers });
	if (staff?.user) {
		const fresh = await prisma.adminUser.findUnique({
			where: { id: staff.user.id },
			select: { role: true },
		});
		return {
			kind: "staff",
			user: {
				...(staff.user as AuthUser),
				role: fresh?.role ?? (staff.user as AuthUser).role,
			},
			session: staff.session as AuthSession,
		};
	}
	const customer = await auth.api.getSession({ headers });
	if (customer?.user) {
		const fresh = await prisma.user.findUnique({
			where: { id: customer.user.id },
			select: { role: true },
		});
		return {
			kind: "customer",
			user: {
				...(customer.user as AuthUser),
				role: fresh?.role ?? (customer.user as AuthUser).role,
			},
			session: customer.session as AuthSession,
		};
	}
	return null;
};

export const requireSession = async (req: WezRequest): Promise<WezSession> => {
	const s = await getSession(req);
	if (!s) throw new UnauthorizedException();
	return s;
};

export const requirePermission = async (req: WezRequest, permission: Permission): Promise<WezSession> => {
	const s = await requireSession(req);
	if (!hasPermission(s.user.role, permission)) {
		throw new ForbiddenException({ code: "MISSING_PERMISSION", message: permission });
	}
	return s;
};

export const requireStaff = async (req: WezRequest): Promise<WezSession> => {
	const s = await requireSession(req);
	if (s.kind !== "staff") throw new ForbiddenException({ code: "STAFF_ONLY" });
	return s;
};

export const requireCustomer = async (req: WezRequest): Promise<WezSession> => {
	const s = await requireSession(req);
	if (s.kind !== "customer") throw new ForbiddenException({ code: "CUSTOMER_ONLY" });
	return s;
};
