import { useQuery, useQueryClient } from "@tanstack/react-query";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const ADMIN_BASE = "/api/admin-auth";

export const adminAuthClient = createAuthClient({
	baseURL: window.location.origin,
	basePath: ADMIN_BASE,
	plugins: [twoFactorClient()],
});

const handle = async (res: Response) => {
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? body?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

const post = async (url: string, body: unknown) => {
	const res = await fetch(url, {
		method: "POST",
		credentials: "include",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return handle(res);
};

export const adminAuthApi = {
	login: (email: string, password: string) => post(`${ADMIN_BASE}/sign-in/email`, { email, password }),
	logout: () => post(`${ADMIN_BASE}/sign-out`, {}),
	me: async () => {
		const res = await fetch(`${ADMIN_BASE}/get-session`, { credentials: "include" });
		return handle(res);
	},
};

export const useAdminSession = () =>
	useQuery({
		queryKey: ["admin-auth", "session"],
		queryFn: () => adminAuthApi.me(),
		retry: false,
		staleTime: 30_000,
	});

export const useInvalidateAdminSession = () => {
	const qc = useQueryClient();
	return () => qc.invalidateQueries({ queryKey: ["admin-auth", "session"] });
};

export type AdminSessionUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	active: boolean;
	twoFactorEnabled: boolean;
};
