import {
	CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	SetMetadata,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { WEZ_ADMIN_ROLES, type WezAdminRole } from "#modules/auth/permissions";
import { PrismaService } from "#shared/database/prisma.service";

// Staff role hierarchy. Higher index = more powerful.
const ROLE_RANK: Record<WezAdminRole, number> = {
	// Operations tier
	instructor: 0,
	agent: 1,
	station_supervisor: 2,
	// HQ tier
	support: 0,
	training_manager: 1,
	hr_manager: 2,
	finance_manager: 2,
	it_manager: 2,
	compliance_officer: 3,
	ops_manager: 3,
	executive_viewer: 1,
	super_admin: 4,
};

const META_REQUIRE_ROLES = "admin.requireRoles";
const META_REQUIRE_MIN = "admin.requireMin";

export const RequireAdminRole = (...roles: WezAdminRole[]) => SetMetadata(META_REQUIRE_ROLES, roles);
export const RequireAdminMin = (min: WezAdminRole) => SetMetadata(META_REQUIRE_MIN, min);

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const session = await adminAuth.api.getSession({ headers: fromNodeHeaders(request.headers) });
		if (!session?.user) throw new UnauthorizedException("Admin authentication required");

		const adminUser = await this.prisma.adminUser.findUnique({
			where: { id: session.user.id },
			select: {
				id: true,
				email: true,
				role: true,
				active: true,
				roleAssignments: { where: { active: true, revokedAt: null }, select: { role: true } },
			},
		});
		if (!adminUser) throw new UnauthorizedException("Admin user not found");
		if (!adminUser.active) throw new ForbiddenException("Admin account inactive");

		const role = (adminUser.role ?? "support") as WezAdminRole;
		if (!WEZ_ADMIN_ROLES.includes(role)) {
			throw new ForbiddenException(`Unknown HQ role: ${role}`);
		}
		const assignedRoles = adminUser.roleAssignments
			.map((assignment) => assignment.role as WezAdminRole)
			.filter((assignedRole) => WEZ_ADMIN_ROLES.includes(assignedRole));
		const effectiveRoles = Array.from(new Set([role, ...assignedRoles]));

		const requiredRoles = this.reflector.getAllAndOverride<WezAdminRole[] | undefined>(META_REQUIRE_ROLES, [
			context.getHandler(),
			context.getClass(),
		]);
		const requiredMin = this.reflector.getAllAndOverride<WezAdminRole | undefined>(META_REQUIRE_MIN, [
			context.getHandler(),
			context.getClass(),
		]);

		if (
			requiredRoles &&
			requiredRoles.length > 0 &&
			!requiredRoles.some((requiredRole) => effectiveRoles.includes(requiredRole))
		) {
			throw new ForbiddenException(`Requires one of: ${requiredRoles.join(", ")}`);
		}
		const effectiveRank = Math.max(...effectiveRoles.map((effectiveRole) => ROLE_RANK[effectiveRole] ?? 0));
		if (requiredMin && effectiveRank < ROLE_RANK[requiredMin]) {
			throw new ForbiddenException(`Requires HQ role >= ${requiredMin}`);
		}

		request.adminUser = { ...session.user, role, roles: effectiveRoles };
		request.adminSession = session.session;
		return true;
	}
}
