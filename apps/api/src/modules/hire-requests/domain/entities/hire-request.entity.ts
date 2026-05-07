export type HireRequestStatus = "awaiting_visit" | "completed" | "cancelled" | "expired";
export type HireRequestChannel = "online" | "in_person";

export interface HireRequest {
	id: string;
	employerId: string;
	employerName?: string;
	workerId: string;
	workerName?: string;
	roleId: string;
	roleName?: string;
	roleCommType?: "flat" | "percent";
	roleCommValue?: number;
	roleSalaryMinCents?: bigint;
	roleSalaryMaxCents?: bigint;
	jobId: string | null;
	proposedSalaryCents: bigint;
	stationId: string;
	stationName?: string;
	status: HireRequestStatus;
	channel: HireRequestChannel;
	note: string | null;
	sourceReferralId: string | null;
	expiresAt: Date;
	completedAt: Date | null;
	cancelledAt: Date | null;
	cancellationReason: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export type NewHireRequest = Omit<
	HireRequest,
	"id" | "completedAt" | "cancelledAt" | "cancellationReason" | "createdAt" | "updatedAt"
>;
export type HireRequestPatch = Partial<{
	status: HireRequestStatus;
	completedAt: Date;
	cancelledAt: Date;
	cancellationReason: string;
}>;

export interface HireRequestFilter {
	employerId?: string;
	workerId?: string;
	stationId?: string;
	status?: HireRequestStatus;
	page?: number;
	limit?: number;
}
