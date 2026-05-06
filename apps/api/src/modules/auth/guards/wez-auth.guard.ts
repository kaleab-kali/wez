import { CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { getSession, type WezSession } from "#shared/auth/session";

const PUBLIC_KEY = "PUBLIC";
const OPTIONAL_KEY = "OPTIONAL";

type RequestWithWezSession = Request & {
	wezSession?: WezSession | null;
	user?: WezSession["user"] | null;
	session?: WezSession["session"] | null;
};

const isAuthRoute = (path: string | undefined) =>
	!!path && (path.startsWith("/api/auth") || path.startsWith("/api/admin-auth"));

@Injectable()
export class WezAuthGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const request = context.switchToHttp().getRequest<RequestWithWezSession>();
		if (isAuthRoute(request.path)) return true;

		const session = await getSession(request);
		request.wezSession = session;
		request.user = session?.user ?? null;
		request.session = session?.session ?? null;

		const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!session && isOptional) return true;
		if (!session) throw new UnauthorizedException();

		return true;
	}
}
