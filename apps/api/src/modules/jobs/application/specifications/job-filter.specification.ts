import type { Prisma } from "../../../../generated/prisma/client";
import type { JobFilter } from "../../domain/entities/job.entity";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_JOB_SORT: NonNullable<JobFilter["sort"]> = "newest";

const JOB_ORDER_BY: Record<NonNullable<JobFilter["sort"]>, Prisma.JobOrderByWithRelationInput> = {
	newest: { postedAt: "desc" },
	salary_high: { salaryMaxCents: "desc" },
	salary_low: { salaryMinCents: "asc" },
};

export const buildJobWhere = (filter: JobFilter, now = new Date()): Prisma.JobWhereInput => {
	const where: Prisma.JobWhereInput = { deletedAt: null };

	if (filter.q && filter.q.trim().length > 0) {
		const term = filter.q.trim();
		where.OR = [
			{ title: { contains: term, mode: "insensitive" } },
			{ description: { contains: term, mode: "insensitive" } },
		];
	}

	if (filter.roleId) where.roleId = filter.roleId;
	if (filter.roleCategory) where.role = { category: filter.roleCategory };
	if (filter.location) where.location = filter.location;
	if (filter.status) where.status = filter.status;
	if (filter.employerType) where.employer = { type: filter.employerType };
	if (filter.salaryMinCents !== undefined) where.salaryMaxCents = { gte: BigInt(filter.salaryMinCents) };
	if (filter.salaryMaxCents !== undefined) where.salaryMinCents = { lte: BigInt(filter.salaryMaxCents) };
	if (filter.postedWithinDays !== undefined) {
		where.postedAt = { gte: new Date(now.getTime() - filter.postedWithinDays * DAY_IN_MS) };
	}
	if (filter.employerId) where.employerId = filter.employerId;

	return where;
};

export const buildJobOrderBy = (filter: JobFilter): Prisma.JobOrderByWithRelationInput =>
	JOB_ORDER_BY[filter.sort ?? DEFAULT_JOB_SORT];
