import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: window.location.origin,
	basePath: "/api/auth",
	plugins: [phoneNumberClient()],
});

export const { useSession, signIn, signOut } = authClient;

// Wez session user shape (from customSession plugin on the server).
export type WezSessionUser = {
	id: string;
	name: string;
	email?: string | null;
	phoneNumber?: string | null;
	role: string;
	localePref: string;
	banned: boolean;
};
