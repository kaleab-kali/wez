import { useQuery, useQueryClient } from "@tanstack/react-query";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const ADMIN_BASE = "/api/admin-auth";
const ADMIN_SESSION_CACHE_MS = 30_000;

export const adminAuthClient = createAuthClient({
	baseURL: window.location.origin,
	basePath: ADMIN_BASE,
	plugins: [twoFactorClient()],
});

export type AdminSessionUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	roles?: string[];
	active: boolean;
	twoFactorEnabled: boolean;
};

type AdminSessionResponse = {
	readonly user?: AdminSessionUser;
	readonly session?: Record<string, unknown> | null;
};

const adminSessionCache: {
	value: AdminSessionResponse | undefined;
	expiresAt: number;
	inflight: Promise<AdminSessionResponse> | undefined;
} = {
	value: undefined,
	expiresAt: 0,
	inflight: undefined,
};

const handle = async <T>(res: Response): Promise<T> => {
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? body?.message ?? `Request failed: ${res.status}`);
	}
	return (await res.json()) as T;
};

const post = async <T>(url: string, body: unknown): Promise<T> => {
	const res = await fetch(url, {
		method: "POST",
		credentials: "include",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return handle<T>(res);
};

export const clearAdminSessionCache = () => {
	adminSessionCache.value = undefined;
	adminSessionCache.expiresAt = 0;
	adminSessionCache.inflight = undefined;
};

const fetchAdminSession = async (): Promise<AdminSessionResponse> => {
	const res = await fetch(`${ADMIN_BASE}/get-session`, { credentials: "include" });
	return handle<AdminSessionResponse>(res);
};

const getAdminSession = async (): Promise<AdminSessionResponse> => {
	const now = Date.now();
	if (adminSessionCache.value && adminSessionCache.expiresAt > now) return adminSessionCache.value;
	if (adminSessionCache.inflight) return adminSessionCache.inflight;

	const request = fetchAdminSession();
	adminSessionCache.inflight = request;
	try {
		const session = await request;
		adminSessionCache.value = session;
		adminSessionCache.expiresAt = Date.now() + ADMIN_SESSION_CACHE_MS;
		return session;
	} finally {
		adminSessionCache.inflight = undefined;
	}
};

export const adminAuthApi = {
	login: async (email: string, password: string) => {
		clearAdminSessionCache();
		const result = await post<unknown>(`${ADMIN_BASE}/sign-in/email`, { email, password });
		clearAdminSessionCache();
		return result;
	},
	logout: async () => {
		clearAdminSessionCache();
		const result = await post<unknown>(`${ADMIN_BASE}/sign-out`, {});
		clearAdminSessionCache();
		return result;
	},
	me: getAdminSession,
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
	return () => {
		clearAdminSessionCache();
		return qc.invalidateQueries({ queryKey: ["admin-auth", "session"] });
	};
};
