export type WorkerTier = "basic" | "verified" | "trained" | "trusted";
export type HopFlag = "none" | "notice" | "warning" | "suspended";
export type Gender = "M" | "F";

export interface Worker {
	id: string;
	userId: string | null;
	fullName: string;
	fayda: string;
	phone: string;
	dateOfBirth: Date | null;
	gender: Gender;
	area: string;
	bio: string | null;
	religion: string | null;
	languages: string[];
	experienceYears: number;
	tier: WorkerTier;
	hopFlag: HopFlag;
	hasHealthCard: boolean;
	hasPoliceClearance: boolean;
	tin: string | null;
	available: boolean;
	registeredByAgentId: string | null;
	registeredAtStationId: string | null;
	ratingAverage: number | null;
	placementsCount: number;
	photoAttachmentId: string | null;
	roles: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface NewWorker {
	fullName: string;
	fayda: string;
	phone: string;
	dateOfBirth: Date | null;
	gender: Gender;
	area: string;
	bio: string | null;
	religion: string | null;
	languages: string[];
	experienceYears: number;
	hasHealthCard: boolean;
	hasPoliceClearance: boolean;
	tin: string | null;
	registeredByAgentId: string;
	registeredAtStationId: string;
	roles: string[];
}

export type WorkerPatch = Partial<{
	fullName: string;
	bio: string;
	religion: string;
	languages: string[];
	experienceYears: number;
	hasHealthCard: boolean;
	hasPoliceClearance: boolean;
	tier: WorkerTier;
	hopFlag: HopFlag;
	available: boolean;
	tin: string | null;
	roles: string[];
}>;

export interface WorkerFilter {
	q?: string; // free text on name/bio
	roleId?: string;
	category?: string;
	woreda?: string;
	minTier?: WorkerTier;
	gender?: Gender;
	language?: string;
	religion?: string;
	minExperience?: number;
	hasHealthCard?: boolean;
	hasPoliceClearance?: boolean;
	hideFlagged?: boolean;
	availableOnly?: boolean;
	page?: number;
	limit?: number;
	sortBy?: "createdAt" | "rating" | "tier" | "experienceYears" | "placementsCount";
	sortOrder?: "asc" | "desc";
}
