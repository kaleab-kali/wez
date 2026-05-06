import { useQuery } from "@tanstack/react-query";

const BASE = "/api/v1/audit-events";

const get = async <T>(url: string): Promise<T> => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

export type AuditEvent = {
	id: string;
	actorId: string | null;
	actorRole: string;
	action: string;
	targetType: string | null;
	targetId: string | null;
	stationId: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	metadata: Record<string, unknown> | null;
	targetSummary: {
		workerName: string;
		employerName: string;
		roleName: string;
		stationName: string;
		status: string;
		salaryCents: string;
		commissionCents: string;
		paymentMethod: string;
		paymentReferenceLast4: string;
		endedReason: string | null;
	} | null;
	createdAt: string;
};

export type AuditEventFilter = {
	action?: string;
	actorRole?: string;
	actorId?: string;
	targetType?: string;
	targetId?: string;
	stationId?: string;
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
};

export const auditLogKeys = {
	all: ["audit-log"] as const,
	list: (filter: AuditEventFilter) => [...auditLogKeys.all, "list", filter] as const,
};

const qs = (filter: AuditEventFilter) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filter)) {
		if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
	}
	return params.toString();
};

export const useAuditEvents = (filter: AuditEventFilter) =>
	useQuery({
		queryKey: auditLogKeys.list(filter),
		queryFn: () =>
			get<{ data: AuditEvent[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});
