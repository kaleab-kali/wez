import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ADMIN_BASE = "/api/v1/admin/locations";
const PUBLIC_BASE = "/api/v1/locations";

const get = async <T>(url: string): Promise<T> => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

const send = async <T>(url: string, method: string, body?: unknown): Promise<T> => {
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

export type Location = {
	id: string;
	code: string;
	kind: "admin_area" | "sub_area" | "locality";
	type: string;
	nameEn: string;
	nameAm: string | null;
	parentId: string | null;
	active: boolean;
	sortOrder: number;
};

export const locationKeys = {
	all: ["locations"] as const,
	list: (kind?: string, parentId?: string, includeInactive = false) =>
		[...locationKeys.all, "list", { kind, parentId, includeInactive }] as const,
};

export const useLocations = (input: { kind?: string; parentId?: string; includeInactive?: boolean } = {}) =>
	useQuery({
		queryKey: locationKeys.list(input.kind, input.parentId, input.includeInactive),
		queryFn: () => {
			const params = new URLSearchParams();
			if (input.kind) params.set("kind", input.kind);
			if (input.parentId) params.set("parentId", input.parentId);
			if (input.includeInactive) params.set("includeInactive", "true");
			return get<{ data: Location[] }>(`${ADMIN_BASE}?${params}`).then((b) => b.data);
		},
	});

export const usePublicLocations = (input: { kind?: string; parentId?: string } = {}) =>
	useQuery({
		queryKey: locationKeys.list(input.kind, input.parentId, false),
		queryFn: () => {
			const params = new URLSearchParams();
			if (input.kind) params.set("kind", input.kind);
			if (input.parentId) params.set("parentId", input.parentId);
			return get<{ data: Location[] }>(`${PUBLIC_BASE}?${params}`).then((b) => b.data);
		},
	});

export const useCreateLocation = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			code: string;
			kind: Location["kind"];
			type: string;
			nameEn: string;
			nameAm?: string;
			parentId?: string;
			sortOrder?: number;
		}) => send<{ data: Location }>(ADMIN_BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
	});
};
