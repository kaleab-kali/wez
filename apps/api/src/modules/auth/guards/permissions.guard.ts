import {
	CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { recordPermissionDenial } from "#shared/audit/permission-denial-audit";
import { getSession, type WezRequest, type WezSession } from "#shared/auth/session";
import { hasPermission, type Permission, permissionsForRole } from "../permissions";

export const PERMISSIONS_KEY = "permissions";

type PermissionsGuardRequest = WezRequest & {
	user?: WezSession["user"];
	session?: WezSession["session"];
};

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!required || required.length === 0) return true;

		const request = context.switchToHttp().getRequest<PermissionsGuardRequest>();
		const session = request.wezSession ?? (await getSession(request));
		if (!session?.user) throw new UnauthorizedException("Authentication required");

		const role = session.user.role;
		const roles = session.user.roles ?? [];
		for (const perm of required) {
			const hasRolePermission =
				roles.some((item) => permissionsForRole(item).includes(perm)) || hasPermission(role, perm);
			if (!hasRolePermission) {
				await recordPermissionDenial({ req: request, session, permission: perm });
				throw new ForbiddenException({ code: "MISSING_PERMISSION", message: `Missing permission: ${perm}` });
			}
		}

		request.user = session.user;
		request.session = session.session;
		request.wezSession = session;
		return true;
	}
}
