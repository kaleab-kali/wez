import { CanActivate, type ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.config";
import type { WezTenantRole } from "../permissions";

export const ROLES_KEY = "wez.roles";

export const Roles = (...roles: WezTenantRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<WezTenantRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!required || required.length === 0) return true;

		const request = context.switchToHttp().getRequest();
		const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
		if (!session?.user) throw new UnauthorizedException("Authentication required");

		const role = (session.user as { role?: string }).role as WezTenantRole | undefined;
		if (!role || !required.includes(role)) {
			throw new ForbiddenException({ code: "WRONG_ROLE", message: `Required role: ${required.join(" | ")}` });
		}

		request.user = session.user;
		request.session = session.session;
		return true;
	}
}
