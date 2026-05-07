export type ReferralStatus = "pending_employer" | "converted" | "declined" | "expired";

export interface Referral {
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
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

export type NewReferral = Omit<Referral, "id" | "declineReason" | "createdAt" | "updatedAt">;
export type ReferralPatch = Partial<{
	status: ReferralStatus;
	declineReason: string | null;
	expiresAt: Date;
}>;

export interface ReferralFilter {
	employerId?: string;
	workerId?: string;
	agentId?: string;
	agentIds?: readonly string[];
	status?: ReferralStatus;
	page?: number;
	limit?: number;
}
