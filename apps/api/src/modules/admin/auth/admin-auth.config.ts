import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, twoFactor } from "better-auth/plugins";
import { prisma } from "#shared/database/prisma-instance";

export const adminAuth = betterAuth({
	basePath: "/api/admin-auth",
	secret: process.env.ADMIN_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5180"],

	database: prismaAdapter(prisma, { provider: "postgresql" }),

	emailAndPassword: {
		enabled: true,
		minPasswordLength: 12,
		maxPasswordLength: 128,
	},

	session: {
		modelName: "adminSession",
		// HQ sessions: 8h fixed, no sliding (per docs/PERMISSIONS_GUIDE.md).
		expiresIn: 60 * 60 * 8,
		updateAge: 0,
		cookieCache: { enabled: true, maxAge: 5 * 60 },
	},

	user: { modelName: "adminUser" },
	account: { modelName: "adminAccount" },
	verification: { modelName: "adminVerification" },

	advanced: { cookiePrefix: "wez_admin" },

	rateLimit: {
		enabled: true,
		customRules: {
			"/sign-in/email": { window: 15 * 60, max: 5 },
			"/two-factor/verify-totp": { window: 15 * 60, max: 5 },
			"/forget-password": { window: 60 * 60, max: 3 },
		},
	},

	plugins: [
		// HQ 2FA per modules.md 1.1.3 — TOTP. Trusted-device cookie 30 days.
		twoFactor({
			schema: { twoFactor: { modelName: "adminTwoFactor" } },
			issuer: "Wez HQ",
			skipVerificationOnEnable: false,
			otpOptions: {
				period: 30,
				digits: 6,
			},
			backupCodeOptions: {
				amount: 10,
				length: 10,
			},
		}),
		// Custom session: expose HQ role in session.user.
		customSession(async ({ user, session }) => {
			const fresh = await prisma.adminUser.findUnique({
				where: { id: user.id },
				select: {
					role: true,
					active: true,
					twoFactorEnabled: true,
					roleAssignments: { where: { active: true, revokedAt: null }, select: { role: true } },
				},
			});
			const role = fresh?.role ?? "support";
			const roles = Array.from(new Set([role, ...(fresh?.roleAssignments.map((assignment) => assignment.role) ?? [])]));
			return {
				user: {
					...user,
					role,
					roles,
					active: fresh?.active ?? true,
					twoFactorEnabled: fresh?.twoFactorEnabled ?? false,
				},
				session,
			};
		}),
	],
});

export type AdminAuth = typeof adminAuth;
