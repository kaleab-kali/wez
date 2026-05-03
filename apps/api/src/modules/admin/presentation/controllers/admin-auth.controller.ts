import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";

@ApiTags("Admin Auth")
@AllowAnonymous()
@Controller("admin/auth")
export class AdminAuthController {
	@Get("me")
	@ApiOperation({ summary: "Get current admin session" })
	async me(@Req() req: any) {
		const session = await adminAuth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (!session?.user) {
			throw new UnauthorizedException("Not authenticated as admin");
		}

		return {
			data: {
				user: { id: session.user.id, email: session.user.email, name: session.user.name },
				session: { id: session.session.id, expiresAt: session.session.expiresAt },
			},
		};
	}
}
