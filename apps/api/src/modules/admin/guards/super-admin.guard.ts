import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";

@Injectable()
export class SuperAdminGuard implements CanActivate {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		const session = await adminAuth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session?.user) {
			throw new UnauthorizedException("Admin authentication required");
		}

		request.adminUser = session.user;
		request.adminSession = session.session;

		return true;
	}
}
