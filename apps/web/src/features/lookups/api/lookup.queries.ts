import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ADMIN_BASE = "/api/v1/admin/lookups";
const PUBLIC_BASE = "/api/v1/lookups";

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

export type Lookup = {
	id: string;
	kind: string;
	value: string;
	labelEn: string;
	labelAm: string | null;
	sortOrder: number;
	archived: boolean;
};

export const lookupKeys = {
	all: ["lookups"] as const,
	adminList: (kind?: string, includeArchived?: boolean) =>
		[...lookupKeys.all, "admin", { kind, includeArchived }] as const,
	publicByKind: (kind: string) => [...lookupKeys.all, "public", kind] as const,
};

export const useAdminLookups = (kind?: string, includeArchived = true) =>
	useQuery({
		queryKey: lookupKeys.adminList(kind, includeArchived),
		queryFn: () => {
			const qs = new URLSearchParams();
			if (kind) qs.set("kind", kind);
			if (includeArchived) qs.set("includeArchived", "true");
			return get<{ data: Lookup[] }>(`${ADMIN_BASE}?${qs.toString()}`).then((b) => b.data);
		},
	});

export const useLookupKind = (kind: string) =>
	useQuery({
		queryKey: lookupKeys.publicByKind(kind),
		queryFn: () => get<{ data: Lookup[] }>(`${PUBLIC_BASE}/${kind}`).then((b) => b.data),
	});

export const useCreateLookup = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			kind: string;
			value: string;
			labelEn: string;
			labelAm?: string;
			sortOrder?: number;
		}) => send<{ data: Lookup }>(ADMIN_BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: lookupKeys.all }),
	});
};

export const useUpdateLookup = (id: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (patch: Partial<Omit<Lookup, "id">>) =>
			send<{ data: Lookup }>(`${ADMIN_BASE}/${id}`, "PATCH", patch).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: lookupKeys.all }),
	});
};
