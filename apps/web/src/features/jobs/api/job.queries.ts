import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/jobs";

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
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

export type JobStatus = "open" | "closed" | "filled";

export type Job = {
	id: string;
	employerId: string;
	employerName?: string;
	employerType?: string;
	roleId: string;
	roleName?: string;
	roleCategory?: string;
	title: string;
	description: string;
	salaryMinCents: string;
	salaryMaxCents: string;
	location: string;
	status: JobStatus;
	postedAt: string;
	createdAt: string;
	updatedAt: string;
};

export type JobFilter = {
	q?: string;
	roleId?: string;
	roleCategory?: string;
	location?: string;
	status?: JobStatus;
	employerType?: "business" | "household";
	salaryMinCents?: number;
	salaryMaxCents?: number;
	postedWithinDays?: number;
	sort?: "newest" | "salary_high" | "salary_low";
	employerId?: string;
	page?: number;
	limit?: number;
};

export type JobInput = {
	roleId: string;
	title: string;
	description: string;
	salaryMinCents: number;
	salaryMaxCents: number;
	location: string;
	employerId?: string;
};

export const jobKeys = {
	all: ["jobs"] as const,
	list: (filter: JobFilter) => [...jobKeys.all, "list", filter] as const,
	detail: (id: string) => [...jobKeys.all, "detail", id] as const,
};

const qs = (filter: JobFilter) => {
	const p = new URLSearchParams();
	for (const [key, value] of Object.entries(filter)) {
		if (value !== undefined && value !== null && value !== "") p.set(key, String(value));
	}
	return p.toString();
};

export const useJobs = (filter: JobFilter) =>
	useQuery({
		queryKey: jobKeys.list(filter),
		queryFn: () =>
			get<{ data: Job[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});

export const useJob = (id: string | undefined) =>
	useQuery({
		queryKey: id ? jobKeys.detail(id) : ["jobs", "detail", "none"],
		queryFn: () => get<{ data: Job }>(`${BASE}/${id}`).then((b) => b.data),
		enabled: !!id,
	});

export const useCreateJob = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: JobInput) => send<{ data: Job }>(BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: jobKeys.all }),
	});
};

export const useUpdateJob = (id: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: Partial<JobInput> & { status?: JobStatus }) =>
			send<{ data: Job }>(`${BASE}/${id}`, "PATCH", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: jobKeys.all }),
	});
};

export const useCloseJob = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => send<{ data: Job }>(`${BASE}/${id}/close`, "POST").then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: jobKeys.all }),
	});
};
