export type JobStatus = "open" | "closed" | "filled";

export interface Job {
	id: string;
	employerId: string;
	roleId: string;
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
	location?: string;
	status?: JobStatus;
	employerId?: string;
	page?: number;
	limit?: number;
}
