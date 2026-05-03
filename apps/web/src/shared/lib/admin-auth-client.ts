import { useQuery } from "@tanstack/react-query";

const ADMIN_BASE = "/api/admin-auth";

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
		const res = await fetch("/api/v1/admin/auth/me", { credentials: "include" });
		return handle(res);
	},
};

export const useAdminSession = () =>
	useQuery({
		queryKey: ["admin-auth", "session"],
		queryFn: () => adminAuthApi.me().then((b) => b.data),
		retry: false,
		staleTime: 30_000,
	});
