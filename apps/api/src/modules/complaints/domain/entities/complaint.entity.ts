export type ComplaintPartyType = "worker" | "employer";
export type ComplaintSeverity = "low" | "medium" | "high";
export type ComplaintStatus = "open" | "mediating" | "closed" | "referred_external";
export type ComplaintResolutionTag = "amicable" | "partial" | "failed";

export interface Complaint {
	id: string;
	filedByType: ComplaintPartyType;
	filedById: string;
	filedByName?: string;
	filedByUserId: string | null;
	againstType: ComplaintPartyType;
	againstId: string;
	againstName?: string;
	placementId: string | null;
	stationId: string | null;
	stationName?: string | null;
	takenByAgentId: string | null;
	takenByAgentName?: string | null;
	type: string;
	severity: ComplaintSeverity;
	description: string;
	status: ComplaintStatus;
	resolution: string | null;
	resolutionTag: ComplaintResolutionTag | null;
	externalCaseId: string | null;
	closedAt: Date | null;
	closedById: string | null;
	closedByName?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export type NewComplaint = Omit<
	Complaint,
	| "id"
	| "filedByName"
	| "againstName"
	| "stationName"
	| "takenByAgentName"
	| "closedByName"
	| "closedAt"
	| "closedById"
	| "createdAt"
	| "updatedAt"
> & {
	closedAt?: Date | null;
	closedById?: string | null;
};

export type ComplaintPatch = Partial<{
	status: ComplaintStatus;
	resolution: string | null;
	resolutionTag: ComplaintResolutionTag | null;
	externalCaseId: string | null;
	closedAt: Date | null;
	closedById: string | null;
}>;

export interface ComplaintFilter {
	status?: ComplaintStatus;
	severity?: ComplaintSeverity;
	stationId?: string;
	stationIds?: readonly string[];
	filedByType?: ComplaintPartyType;
	filedById?: string;
	againstType?: ComplaintPartyType;
	againstId?: string;
	participantType?: ComplaintPartyType;
	participantId?: string;
	page?: number;
	limit?: number;
}
