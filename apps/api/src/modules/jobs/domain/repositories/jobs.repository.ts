import type { Job, JobFilter, JobPatch, NewJob } from "../entities/job.entity";

export const JOBS_REPO = Symbol("JOBS_REPO");

export interface IJobsRepository {
	findById(id: string): Promise<Job | null>;
	create(data: NewJob): Promise<Job>;
	update(id: string, patch: JobPatch): Promise<Job>;
	listByFilter(filter: JobFilter): Promise<{ items: Job[]; total: number }>;
	softDelete(id: string): Promise<void>;
}
