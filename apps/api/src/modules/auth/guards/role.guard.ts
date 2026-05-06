import { CanActivate, type ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getSession } from "#shared/auth/session";
import type { WezRole } from "../permissions";

export const ROLES_KEY = "wez.roles";

export const Roles = (...roles: WezRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<WezRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!required || required.length === 0) return true;

		const request = context.switchToHttp().getRequest();
		const session = request.wezSession ?? await getSession(request);
		if (!session?.user) throw new UnauthorizedException("Authentication required");

		const role = session.user.role as WezRole | undefined;
		if (!role || !required.includes(role)) {
			throw new ForbiddenException({ code: "WRONG_ROLE", message: `Required role: ${required.join(" | ")}` });
		}

		request.user = session.user;
		request.session = session.session;
		request.wezSession = session;
		return true;
	}
}
