import type { IncomingHttpHeaders } from "node:http";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { auth } from "#modules/auth/auth.config";
import { hasPermission, isStaffRole, type Permission, permissionsForRole } from "#modules/auth/permissions";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import { recordPermissionDenial } from "#shared/audit/permission-denial-audit";
import { prisma } from "#shared/database/prisma-instance";

type AuthUser = {
	id: string;
	email?: string | null;
	name?: string;
	role?: string;
	roles?: string[];
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
	auditContext?: AuditRequestContext;
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
			select: {
				role: true,
				roleAssignments: { where: { active: true, revokedAt: null }, select: { role: true } },
			},
		});
		const assignedRoles = fresh?.roleAssignments.map((assignment) => assignment.role).filter(isStaffRole) ?? [];
		const primaryRole = fresh?.role ?? (staff.user as AuthUser).role;
		const effectiveRoles = [primaryRole, ...assignedRoles].filter(
			(role): role is string => typeof role === "string" && isStaffRole(role),
		);
		return {
			kind: "staff",
			user: {
				...(staff.user as AuthUser),
				role: primaryRole,
				roles: Array.from(new Set(effectiveRoles)),
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
	const userWithRoles = s.user as AuthUser & { roles?: string[] };
	const hasRolePermission =
		userWithRoles.roles?.some((role) => permissionsForRole(role).includes(permission)) ??
		hasPermission(s.user.role, permission);
	if (!hasRolePermission) {
		await recordPermissionDenial({ req, session: s, permission });
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
