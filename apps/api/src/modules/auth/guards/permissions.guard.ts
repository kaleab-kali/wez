import {
	CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getSession } from "#shared/auth/session";
import { hasPermission, type Permission } from "../permissions";

export const PERMISSIONS_KEY = "permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!required || required.length === 0) return true;

		const request = context.switchToHttp().getRequest();
		const session = request.wezSession ?? (await getSession(request));
		if (!session?.user) throw new UnauthorizedException("Authentication required");

		const role = session.user.role;
		for (const perm of required) {
			if (!hasPermission(role, perm)) {
				throw new ForbiddenException({ code: "MISSING_PERMISSION", message: `Missing permission: ${perm}` });
			}
		}

		request.user = session.user;
		request.session = session.session;
		request.wezSession = session;
		return true;
	}
}
