import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ADMIN_BASE = "/api/v1/admin/stations";
const PUBLIC_BASE = "/api/v1/stations";

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

export type Station = {
	id: string;
	name: string;
	woreda: string;
	address: string;
	phone: string | null;
	active: boolean;
	supervisorUserId: string | null;
	createdAt: string;
	updatedAt: string;
};

export const stationKeys = {
	all: ["stations"] as const,
	lists: () => [...stationKeys.all, "list"] as const,
	list: (includeInactive: boolean) => [...stationKeys.lists(), { includeInactive }] as const,
	detail: (id: string) => [...stationKeys.all, "detail", id] as const,
	assignments: (id: string) => [...stationKeys.all, "assignments", id] as const,
};

export const useStations = (includeInactive = false) =>
	useQuery({
		queryKey: stationKeys.list(includeInactive),
		queryFn: () => get<{ data: Station[] }>(`${ADMIN_BASE}?includeInactive=${includeInactive}`).then((b) => b.data),
	});

export const usePublicStations = () =>
	useQuery({
		queryKey: [...stationKeys.all, "public"] as const,
		queryFn: () => get<{ data: Station[] }>(PUBLIC_BASE).then((b) => b.data),
	});

export const useCreateStation = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { name: string; woreda: string; address: string; phone?: string; supervisorUserId?: string }) =>
			send<{ data: Station }>(ADMIN_BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: stationKeys.lists() }),
	});
};

export const useUpdateStation = (id: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (patch: Partial<Station>) =>
			send<{ data: Station }>(`${ADMIN_BASE}/${id}`, "PATCH", patch).then((b) => b.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: stationKeys.lists() });
			qc.invalidateQueries({ queryKey: stationKeys.detail(id) });
		},
	});
};
