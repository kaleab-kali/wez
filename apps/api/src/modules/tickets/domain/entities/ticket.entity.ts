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

export interface Ticket {
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
	resolvedAt: Date | null;
	resolvedById: string | null;
	resolvedByName?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export type NewTicket = Omit<
	Ticket,
	| "id"
	| "raisedByName"
	| "raisedByRole"
	| "assignedToName"
	| "assignedToRole"
	| "resolvedByName"
	| "resolution"
	| "resolvedAt"
	| "resolvedById"
	| "createdAt"
	| "updatedAt"
> & {
	resolution?: string | null;
	resolvedAt?: Date | null;
	resolvedById?: string | null;
};

export type TicketPatch = Partial<{
	status: TicketStatus;
	assignedToId: string | null;
	resolution: string | null;
	resolvedAt: Date | null;
	resolvedById: string | null;
}>;

export interface TicketFilter {
	status?: TicketStatus;
	priority?: TicketPriority;
	category?: TicketCategory;
	assignedToId?: string;
	raisedById?: string;
	visibleRaisedByIds?: readonly string[];
	visibleAssignedToIds?: readonly string[];
	page?: number;
	limit?: number;
}

export type TicketAssignmentOption = {
	id: string;
	name: string;
	email: string;
	role: string;
};
