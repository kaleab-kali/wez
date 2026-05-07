import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/workers";

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

export type Worker = {
	id: string;
	fullName: string;
	fayda: string;
	phone: string;
	gender: "M" | "F";
	area: string;
	bio: string | null;
	languages: string[];
	experienceYears: number;
	tier: "basic" | "verified" | "trained" | "trusted";
	hopFlag: "none" | "notice" | "warning" | "suspended";
	hasHealthCard: boolean;
	hasPoliceClearance: boolean;
	available: boolean;
	ratingAverage: number | null;
	placementsCount: number;
	roles: string[];
	createdAt: string;
	updatedAt: string;
};

export type WorkerFilter = {
	q?: string;
	roleId?: string;
	woreda?: string;
	minTier?: Worker["tier"];
	gender?: Worker["gender"];
	language?: string;
	minExperience?: number;
	hasHealthCard?: boolean;
	hasPoliceClearance?: boolean;
	hideFlagged?: boolean;
	availableOnly?: boolean;
	page?: number;
	limit?: number;
	sortBy?: "createdAt" | "rating" | "tier" | "experienceYears" | "placementsCount";
	sortOrder?: "asc" | "desc";
};

export const workerKeys = {
	all: ["workers"] as const,
	lists: () => [...workerKeys.all, "list"] as const,
	list: (filter: WorkerFilter) => [...workerKeys.lists(), filter] as const,
	detail: (id: string) => [...workerKeys.all, "detail", id] as const,
	me: () => [...workerKeys.all, "me"] as const,
};

const toQueryString = (filter: WorkerFilter) => {
	const params = new URLSearchParams();
	for (const [k, v] of Object.entries(filter)) {
		if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
	}
	return params.toString();
};

export const useWorkers = (filter: WorkerFilter) =>
	useQuery({
		queryKey: workerKeys.list(filter),
		queryFn: () =>
			get<{ data: Worker[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${toQueryString(filter)}`,
			),
	});

export const useWorker = (id: string | undefined) =>
	useQuery({
		queryKey: id ? workerKeys.detail(id) : ["workers", "detail", "none"],
		queryFn: () => get<{ data: Worker }>(`${BASE}/${id}`).then((b) => b.data),
		enabled: !!id,
	});

export const useMyWorkerProfile = () =>
	useQuery({
		queryKey: workerKeys.me(),
		queryFn: () => get<{ data: Worker }>(`${BASE}/me`).then((b) => b.data),
	});

export const useRegisterWorker = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			fullName: string;
			fayda: string;
			phone: string;
			loginEmail?: string;
			loginPassword?: string;
			gender: "M" | "F";
			area: string;
			bio?: string;
			religion?: string;
			languages: string[];
			experienceYears: number;
			hasHealthCard: boolean;
			hasPoliceClearance: boolean;
			tin?: string;
			roles: string[];
			stationId: string;
		}) => send<{ data: Worker }>(BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: workerKeys.lists() }),
	});
};

export const useUpdateWorker = (id: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (patch: Partial<Worker>) => send<{ data: Worker }>(`${BASE}/${id}`, "PATCH", patch).then((b) => b.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: workerKeys.lists() });
			qc.invalidateQueries({ queryKey: workerKeys.detail(id) });
		},
	});
};

export const useUpdateMyWorkerProfile = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (patch: { bio?: string; languages?: string[] }) =>
			send<{ data: Worker }>(`${BASE}/me`, "PATCH", patch).then((b) => b.data),
		onSuccess: (worker) => {
			qc.invalidateQueries({ queryKey: workerKeys.me() });
			qc.invalidateQueries({ queryKey: workerKeys.detail(worker.id) });
		},
	});
};
