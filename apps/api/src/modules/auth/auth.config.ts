import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "#shared/database/prisma-instance";

export const auth = betterAuth({
	basePath: "/api/auth",
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5180"],

	database: prismaAdapter(prisma, { provider: "postgresql" }),

	emailAndPassword: { enabled: true },

	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30-day max per modules.md 1.4.1
		updateAge: 60 * 60 * 24, // sliding refresh on activity
	},
});

export type Auth = typeof auth;
