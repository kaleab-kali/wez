import { CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.config";
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
		const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
		if (!session?.user) throw new UnauthorizedException("Authentication required");

		const role = (session.user as { role?: string }).role;
		for (const perm of required) {
			if (!hasPermission(role, perm)) {
				throw new ForbiddenException({ code: "MISSING_PERMISSION", message: `Missing permission: ${perm}` });
			}
		}

		request.user = session.user;
		request.session = session.session;
		return true;
	}
}
