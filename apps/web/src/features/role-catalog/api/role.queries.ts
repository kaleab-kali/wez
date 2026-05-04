import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ADMIN_BASE = "/api/v1/admin/role-catalog";
const PUBLIC_BASE = "/api/v1/role-catalog";

const get = async <T,>(url: string): Promise<T> => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

const send = async <T,>(url: string, method: string, body?: unknown): Promise<T> => {
	const res = await fetch(url, {
		method,
		credentials: "include",
		headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const errBody = await res.json().catch(() => ({}));
		throw new Error(errBody?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

export type Role = {
	id: string;
	name: string;
	category: string;
	commType: "flat" | "percent";
	commValue: number;
	salaryMinCents: string;
	salaryMaxCents: string;
	active: boolean;
	createdAt: string;
	updatedAt: string;
};

export const roleKeys = {
	all: ["roles"] as const,
	adminList: (includeInactive: boolean) => [...roleKeys.all, "admin", { includeInactive }] as const,
	publicList: () => [...roleKeys.all, "public"] as const,
};

export const useAdminRoles = (includeInactive = false) =>
	useQuery({
		queryKey: roleKeys.adminList(includeInactive),
		queryFn: () =>
			get<{ data: Role[] }>(`${ADMIN_BASE}?includeInactive=${includeInactive}`).then((b) => b.data),
	});

export const usePublicRoles = () =>
	useQuery({
		queryKey: roleKeys.publicList(),
		queryFn: () => get<{ data: Role[] }>(PUBLIC_BASE).then((b) => b.data),
	});

export const useCreateRole = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			id: string;
			name: string;
			category: string;
			commType: "flat" | "percent";
			commValue: number;
			salaryMinCents: number;
			salaryMaxCents: number;
		}) => send<{ data: Role }>(ADMIN_BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
	});
};

export const useUpdateRole = (id: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (patch: Partial<Role>) =>
			send<{ data: Role }>(`${ADMIN_BASE}/${id}`, "PATCH", patch).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
	});
};
