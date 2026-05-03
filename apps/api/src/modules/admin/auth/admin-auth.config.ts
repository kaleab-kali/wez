import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "#shared/database/prisma-instance";

export const adminAuth = betterAuth({
	basePath: "/api/admin-auth",
	secret: process.env.ADMIN_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5180"],

	database: prismaAdapter(prisma, { provider: "postgresql" }),

	emailAndPassword: { enabled: true },

	user: {
		modelName: "adminUser",
	},

	session: {
		modelName: "adminSession",
		expiresIn: 60 * 60 * 8,
		updateAge: 60 * 60,
	},

	account: {
		modelName: "adminAccount",
	},

	verification: {
		modelName: "adminVerification",
	},

	advanced: {
		cookiePrefix: "wez_admin",
	},
});

export type AdminAuth = typeof adminAuth;
