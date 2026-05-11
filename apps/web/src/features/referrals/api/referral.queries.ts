import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/referrals";

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

export type ReferralStatus = "pending_employer" | "converted" | "declined" | "expired";

export type Referral = {
	id: string;
	workerId: string;
	workerName?: string;
	employerId: string;
	employerName?: string;
	jobId: string | null;
	jobTitle?: string | null;
	agentId: string;
	note: string | null;
	status: ReferralStatus;
	declineReason: string | null;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
};

export type ReferralFilter = {
	employerId?: string;
	workerId?: string;
	status?: ReferralStatus;
	page?: number;
	limit?: number;
};

export const referralKeys = {
	all: ["referrals"] as const,
	list: (filter: ReferralFilter) => [...referralKeys.all, "list", filter] as const,
};

const qs = (filter: ReferralFilter) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filter)) {
		if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
	}
	return params.toString();
};

export const useReferrals = (filter: ReferralFilter) =>
	useQuery({
		queryKey: referralKeys.list(filter),
		queryFn: () =>
			get<{ data: Referral[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});

export const useCreateReferral = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { workerId: string; employerId: string; jobId?: string; note?: string }) =>
			send<{ data: Referral }>(BASE, "POST", input).then((body) => body.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: referralKeys.all }),
	});
};

export const useAcceptReferral = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			id: string;
			stationId?: string;
			roleId?: string;
			proposedSalaryCents: number;
			note?: string;
		}) =>
			send<{ data: { referral: Referral } }>(`${BASE}/${input.id}/accept`, "POST", {
				stationId: input.stationId,
				roleId: input.roleId,
				proposedSalaryCents: input.proposedSalaryCents,
				note: input.note,
			}).then((body) => body.data.referral),
		onSuccess: () => qc.invalidateQueries({ queryKey: referralKeys.all }),
	});
};

export const useDeclineReferral = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; reason: string }) =>
			send<{ data: Referral }>(`${BASE}/${input.id}/decline`, "POST", { reason: input.reason }).then(
				(body) => body.data,
			),
		onSuccess: () => qc.invalidateQueries({ queryKey: referralKeys.all }),
	});
};

export const useDeferReferral = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; days: number }) =>
			send<{ data: Referral }>(`${BASE}/${input.id}/defer`, "POST", { days: input.days }).then((body) => body.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: referralKeys.all }),
	});
};
