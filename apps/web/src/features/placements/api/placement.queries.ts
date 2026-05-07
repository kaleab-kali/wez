import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hireRequestKeys } from "#features/hire-requests/api/hire-request.queries";
import { workerKeys } from "#features/workers/api/worker.queries";

const BASE = "/api/v1/placements";
export const PAYMENT_METHODS = ["telebirr", "cbe_birr", "bank", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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

export type Placement = {
	id: string;
	hireRequestId: string | null;
	workerId: string;
	worker?: { fullName: string; phone: string; area: string };
	employerId: string;
	employer?: { name: string; type: string; phone: string; rating: string };
	roleId: string;
	role?: {
		name: string;
		category: string;
		commType: "flat" | "percent";
		commValue: number;
		salaryMinCents: string;
		salaryMaxCents: string;
	};
	stationId: string;
	station?: { name: string; woreda: string };
	finalizedByAgent?: { name: string; email: string };
	job?: { id: string; title: string; location: string } | null;
	startDate: string;
	endDate: string | null;
	endedReason: string | null;
	ratingByEmployer: string | null;
	ratingCommentByEmployer: string | null;
	ratingByWorker: string | null;
	ratingCommentByWorker: string | null;
	ratingWindowClosesAt: string | null;
	salaryCents: string;
	commissionCents: string;
	paymentMethod: PaymentMethod | string;
	paymentReference: string;
	paymentReceivedAt: string;
	agreementPdfUrl: string | null;
	status: "active" | "ended" | "disputed" | "cancelled";
	createdAt: string;
};

export type PlacementFilter = {
	status?: Placement["status"];
	workerId?: string;
	employerId?: string;
	stationId?: string;
	page?: number;
	limit?: number;
};

export const placementKeys = {
	all: ["placements"] as const,
	list: (f: PlacementFilter) => [...placementKeys.all, "list", f] as const,
};

const qs = (f: PlacementFilter) => {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(f)) {
		if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
	}
	return p.toString();
};

export const usePlacements = (filter: PlacementFilter) =>
	useQuery({
		queryKey: placementKeys.list(filter),
		queryFn: () =>
			get<{ data: Placement[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});

export const useFinalizePlacement = (hireRequestId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			startDate: string;
			salaryCents: number;
			paymentMethod: PaymentMethod;
			paymentReference: string;
			paymentReceivedAt: string;
			cashDoubleConfirmed?: boolean;
		}) =>
			send<{ data: Placement }>(`${BASE}/from-hire-request/${hireRequestId}/finalize`, "POST", input).then(
				(b) => b.data,
			),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: hireRequestKeys.all });
			qc.invalidateQueries({ queryKey: placementKeys.all });
			qc.invalidateQueries({ queryKey: workerKeys.all });
		},
	});
};

export const useFinalizeFreshPlacement = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			workerId: string;
			employerId: string;
			roleId: string;
			stationId: string;
			startDate: string;
			salaryCents: number;
			paymentMethod: PaymentMethod;
			paymentReference: string;
			paymentReceivedAt: string;
			cashDoubleConfirmed?: boolean;
		}) => send<{ data: Placement }>(`${BASE}/fresh/finalize`, "POST", input).then((b) => b.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: placementKeys.all });
			qc.invalidateQueries({ queryKey: workerKeys.all });
			qc.invalidateQueries({ queryKey: hireRequestKeys.all });
		},
	});
};

export const useEndPlacement = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			id: string;
			endDate: string;
			endedReason: string;
			ratingByEmployer?: number;
			ratingCommentByEmployer?: string;
			ratingByWorker?: number;
			ratingCommentByWorker?: string;
		}) =>
			send<{ data: Placement }>(`${BASE}/${input.id}/end`, "POST", {
				endDate: input.endDate,
				endedReason: input.endedReason,
				ratingByEmployer: input.ratingByEmployer,
				ratingCommentByEmployer: input.ratingCommentByEmployer,
				ratingByWorker: input.ratingByWorker,
				ratingCommentByWorker: input.ratingCommentByWorker,
			}).then((b) => b.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: placementKeys.all });
			qc.invalidateQueries({ queryKey: workerKeys.all });
		},
	});
};
