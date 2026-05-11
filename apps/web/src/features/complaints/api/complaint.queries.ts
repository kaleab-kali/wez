import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employerKeys } from "#features/employers/api/employer.queries";
import { workerKeys } from "#features/workers/api/worker.queries";

const BASE = "/api/v1/complaints";

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

export type ComplaintPartyType = "worker" | "employer";
export type ComplaintSeverity = "low" | "medium" | "high";
export type ComplaintStatus = "open" | "mediating" | "closed" | "referred_external";
export type ComplaintResolutionTag = "amicable" | "partial" | "failed";

export type Complaint = {
	id: string;
	filedByType: ComplaintPartyType;
	filedById: string;
	filedByName?: string;
	againstType: ComplaintPartyType;
	againstId: string;
	againstName?: string;
	placementId: string | null;
	stationId: string | null;
	stationName?: string | null;
	type: string;
	severity: ComplaintSeverity;
	status: ComplaintStatus;
	description: string;
	resolution: string | null;
	resolutionTag: ComplaintResolutionTag | null;
	externalCaseId: string | null;
	closedAt: string | null;
	closedByName?: string | null;
	createdAt: string;
};

export type ComplaintFilter = {
	status?: ComplaintStatus;
	severity?: ComplaintSeverity;
	stationId?: string;
	page?: number;
	limit?: number;
};

export const complaintKeys = {
	all: ["complaints"] as const,
	list: (filter: ComplaintFilter) => [...complaintKeys.all, "list", filter] as const,
};

const qs = (filter: ComplaintFilter) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filter)) {
		if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
	}
	return params.toString();
};

export const complaintReferralLetterUrl = (id: string) => `${BASE}/${id}/referral-letter`;

export const useComplaints = (filter: ComplaintFilter) =>
	useQuery({
		queryKey: complaintKeys.list(filter),
		queryFn: () =>
			get<{ data: Complaint[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});

export const useCreateComplaint = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			filedByType: ComplaintPartyType;
			filedById?: string;
			againstType: ComplaintPartyType;
			againstId: string;
			placementId?: string;
			stationId?: string;
			type: string;
			severity: ComplaintSeverity;
			description: string;
		}) => send<{ data: Complaint }>(BASE, "POST", input).then((body) => body.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: complaintKeys.all });
			qc.invalidateQueries({ queryKey: employerKeys.all });
			qc.invalidateQueries({ queryKey: workerKeys.all });
		},
	});
};

export const useMediateComplaint = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => send<{ data: Complaint }>(`${BASE}/${id}/mediate`, "POST").then((body) => body.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: complaintKeys.all }),
	});
};

export const useReferComplaintExternal = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; externalCaseId?: string; resolution?: string }) =>
			send<{ data: Complaint }>(`${BASE}/${input.id}/refer-external`, "POST", {
				externalCaseId: input.externalCaseId,
				resolution: input.resolution,
			}).then((body) => body.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: complaintKeys.all }),
	});
};

export const useCloseComplaint = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; resolution: string; resolutionTag: ComplaintResolutionTag }) =>
			send<{ data: Complaint }>(`${BASE}/${input.id}/close`, "POST", {
				resolution: input.resolution,
				resolutionTag: input.resolutionTag,
			}).then((body) => body.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: complaintKeys.all });
			qc.invalidateQueries({ queryKey: employerKeys.all });
			qc.invalidateQueries({ queryKey: workerKeys.all });
		},
	});
};
