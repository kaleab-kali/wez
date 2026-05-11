import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/tickets";

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

export type TicketCategory =
	| "system_issue"
	| "policy_question"
	| "compliance_concern"
	| "finance_issue"
	| "training_request"
	| "hr_issue"
	| "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "escalated_higher";

export type Ticket = {
	id: string;
	raisedById: string;
	raisedByName?: string;
	raisedByRole?: string;
	category: TicketCategory;
	title: string;
	description: string;
	priority: TicketPriority;
	status: TicketStatus;
	assignedToId: string | null;
	assignedToName?: string | null;
	assignedToRole?: string | null;
	resolution: string | null;
	resolvedAt: string | null;
	resolvedByName?: string | null;
	createdAt: string;
};

export type TicketAssignmentOption = {
	id: string;
	name: string;
	email: string;
	role: string;
};

export type TicketFilter = {
	status?: TicketStatus;
	priority?: TicketPriority;
	category?: TicketCategory;
	page?: number;
	limit?: number;
};

export const ticketKeys = {
	all: ["tickets"] as const,
	list: (filter: TicketFilter) => [...ticketKeys.all, "list", filter] as const,
	assignmentOptions: () => [...ticketKeys.all, "assignment-options"] as const,
};

const qs = (filter: TicketFilter) => {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filter)) {
		if (value !== undefined && value !== null) params.set(key, String(value));
	}
	return params.toString();
};

export const useTickets = (filter: TicketFilter) =>
	useQuery({
		queryKey: ticketKeys.list(filter),
		queryFn: () =>
			get<{ data: Ticket[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});

export const useTicketAssignmentOptions = (enabled: boolean) =>
	useQuery({
		queryKey: ticketKeys.assignmentOptions(),
		queryFn: () => get<{ data: TicketAssignmentOption[] }>(`${BASE}/assignment-options`).then((body) => body.data),
		enabled,
	});

export const useCreateTicket = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { category: TicketCategory; title: string; description: string; priority: TicketPriority }) =>
			send<{ data: Ticket }>(BASE, "POST", input).then((body) => body.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
	});
};

export const useAssignTicket = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; assignedToId: string }) =>
			send<{ data: Ticket }>(`${BASE}/${input.id}/assign`, "POST", { assignedToId: input.assignedToId }).then(
				(body) => body.data,
			),
		onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
	});
};

export const useResolveTicket = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; resolution: string }) =>
			send<{ data: Ticket }>(`${BASE}/${input.id}/resolve`, "POST", { resolution: input.resolution }).then(
				(body) => body.data,
			),
		onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
	});
};

export const useCloseTicket = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => send<{ data: Ticket }>(`${BASE}/${id}/close`, "POST").then((body) => body.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
	});
};
