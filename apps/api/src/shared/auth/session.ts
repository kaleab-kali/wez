import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { auth } from "#modules/auth/auth.config";
import { hasPermission, type Permission } from "#modules/auth/permissions";

export type WezSession = {
	kind: "staff" | "customer";
	user: { id: string; email?: string | null; name?: string; role?: string };
	session: { id: string; token: string };
};

/**
 * Resolve the current request to either a staff (admin Better Auth) or
 * customer (tenant Better Auth) session. Tries staff first since they have
 * stricter cookies + tend to make more API calls.
 */
export const getSession = async (req: any): Promise<WezSession | null> => {
	const headers = fromNodeHeaders(req.headers);
	const staff = await adminAuth.api.getSession({ headers });
	if (staff?.user) {
		return { kind: "staff", user: staff.user as never, session: staff.session as never };
	}
	const customer = await auth.api.getSession({ headers });
	if (customer?.user) {
		return { kind: "customer", user: customer.user as never, session: customer.session as never };
	}
	return null;
};

export const requireSession = async (req: any): Promise<WezSession> => {
	const s = await getSession(req);
	if (!s) throw new UnauthorizedException();
	return s;
};

export const requirePermission = async (req: any, permission: Permission): Promise<WezSession> => {
	const s = await requireSession(req);
	if (!hasPermission(s.user.role, permission)) {
		throw new ForbiddenException({ code: "MISSING_PERMISSION", message: permission });
	}
	return s;
};

export const requireStaff = async (req: any): Promise<WezSession> => {
	const s = await requireSession(req);
	if (s.kind !== "staff") throw new ForbiddenException({ code: "STAFF_ONLY" });
	return s;
};

export const requireCustomer = async (req: any): Promise<WezSession> => {
	const s = await requireSession(req);
	if (s.kind !== "customer") throw new ForbiddenException({ code: "CUSTOMER_ONLY" });
	return s;
};
