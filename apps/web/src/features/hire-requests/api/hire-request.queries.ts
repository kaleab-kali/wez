import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/hire-requests";

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

export type HireRequestStatus = "awaiting_visit" | "completed" | "cancelled" | "expired";

export type HireRequest = {
	id: string;
	employerId: string;
	workerId: string;
	roleId: string;
	jobId: string | null;
	proposedSalaryCents: string;
	stationId: string;
	status: HireRequestStatus;
	channel: "online" | "in_person";
	note: string | null;
	expiresAt: string;
	completedAt: string | null;
	cancelledAt: string | null;
	cancellationReason: string | null;
	createdAt: string;
};

export type HireRequestFilter = {
	employerId?: string;
	workerId?: string;
	stationId?: string;
	status?: HireRequestStatus;
	page?: number;
	limit?: number;
};

export const hireRequestKeys = {
	all: ["hire-requests"] as const,
	list: (f: HireRequestFilter) => [...hireRequestKeys.all, "list", f] as const,
	detail: (id: string) => [...hireRequestKeys.all, "detail", id] as const,
};

const qs = (f: HireRequestFilter) => {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(f)) {
		if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
	}
	return p.toString();
};

export const useHireRequests = (filter: HireRequestFilter) =>
	useQuery({
		queryKey: hireRequestKeys.list(filter),
		queryFn: () =>
			get<{ data: HireRequest[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});

export const useCreateHireRequest = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			workerId: string;
			roleId: string;
			employerId?: string;
			jobId?: string;
			proposedSalaryCents: number;
			stationId: string;
			channel: "online" | "in_person";
			note?: string;
		}) => send<{ data: HireRequest }>(BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: hireRequestKeys.all }),
	});
};

export const useCancelHireRequest = (id: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { reason: string }) =>
			send<{ data: HireRequest }>(`${BASE}/${id}/cancel`, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: hireRequestKeys.all }),
	});
};
