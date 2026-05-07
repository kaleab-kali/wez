import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, phoneNumber } from "better-auth/plugins";
import { prisma } from "#shared/database/prisma-instance";
import { sendSms } from "#shared/notifications/sms-sender";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const WORKER_ROLE = "worker";

export const auth = betterAuth({
	basePath: "/api/auth",
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5180"],

	database: prismaAdapter(prisma, { provider: "postgresql" }),

	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
		autoSignIn: true,
		// Reset password email — wired in Phase 1G when the email channel adapter ships.
		// sendResetPassword: async ({ user, url }) => { ... }
	},

	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30-day max per modules.md 1.4.1
		updateAge: 60 * 60 * 24, // sliding refresh on activity
		cookieCache: { enabled: true, maxAge: 5 * 60 },
	},

	rateLimit: {
		enabled: true,
		// Per modules.md 1.1.1.3 — login: 5/15min per IP+email.
		// Better Auth's default rate limiter applies window per route; tighter for sign-in.
		customRules: {
			"/sign-in/email": { window: 15 * 60, max: 5 },
			"/sign-up/email": { window: 60 * 60, max: 10 },
			"/phone-number/send-otp": { window: 15 * 60, max: 3 },
			"/phone-number/verify": { window: 15 * 60, max: 5 },
			"/forget-password": { window: 60 * 60, max: 3 },
		},
	},

	plugins: [
		// Worker phone+OTP login (modules.md 1.1.2). HQ + business employers use email.
		phoneNumber({
			otpLength: 6,
			expiresIn: 5 * 60,
			phoneNumberValidator: (n) => ETHIOPIAN_PHONE.test(n),
			sendOTP: async ({ phoneNumber: to, code }) => {
				await sendSms(to, `Your Wez code: ${code}. Valid 5 minutes.`);
			},
			signUpOnVerification: {
				getTempEmail: (n) => `${n.replace("+", "")}@phone.wez.local`,
				getTempName: (n) => `Worker ${n.slice(-4)}`,
			},
		}),
		// Note: Better Auth admin plugin (impersonation) is wired in Phase 1F when audit interceptor lands.
		// Custom session: surface Wez role + phone in session.user response.
		customSession(async ({ user, session }) => {
			const fresh = await prisma.user.findUnique({
				where: { id: user.id },
				select: { role: true, phoneNumber: true, localePref: true, banned: true },
			});
			const role = fresh?.role ?? WORKER_ROLE;
			if (role === WORKER_ROLE && fresh?.phoneNumber) {
				await prisma.worker.updateMany({
					where: {
						phone: fresh.phoneNumber,
						userId: null,
						deletedAt: null,
					},
					data: { userId: user.id },
				});
			}
			return {
				user: {
					...user,
					role,
					phoneNumber: fresh?.phoneNumber ?? null,
					localePref: fresh?.localePref ?? "en",
					banned: fresh?.banned ?? false,
				},
				session,
			};
		}),
	],
});

export type Auth = typeof auth;
