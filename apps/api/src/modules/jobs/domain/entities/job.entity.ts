export type JobStatus = "open" | "closed" | "filled";

export interface Job {
	id: string;
	employerId: string;
	employerName?: string;
	employerType?: string;
	roleId: string;
	roleName?: string;
	roleCategory?: string;
	title: string;
	description: string;
	salaryMinCents: bigint;
	salaryMaxCents: bigint;
	location: string;
	status: JobStatus;
	postedAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

export type NewJob = Omit<Job, "id" | "postedAt" | "createdAt" | "updatedAt">;
export type JobPatch = Partial<{
	title: string;
	description: string;
	salaryMinCents: bigint;
	salaryMaxCents: bigint;
	location: string;
	status: JobStatus;
}>;

export interface JobFilter {
	q?: string;
	roleId?: string;
	roleCategory?: string;
	location?: string;
	status?: JobStatus;
	employerType?: "business" | "household";
	salaryMinCents?: number;
	salaryMaxCents?: number;
	postedWithinDays?: number;
	sort?: "newest" | "salary_high" | "salary_low";
	employerId?: string;
	page?: number;
	limit?: number;
}
