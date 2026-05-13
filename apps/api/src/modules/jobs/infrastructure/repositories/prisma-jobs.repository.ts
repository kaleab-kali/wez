import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import {
	intersectRankedIds,
	normalizeSearchQuery,
	orderRowsByIdList,
	pageWindow,
	type RankedId,
} from "#shared/search/postgres-fts";
import { Prisma } from "../../../../generated/prisma/client";
import { buildJobOrderBy, buildJobWhere } from "../../application/specifications/job-filter.specification";
import type { Job, JobFilter, JobPatch, JobStatus, NewJob } from "../../domain/entities/job.entity";
import type { IJobsRepository } from "../../domain/repositories/jobs.repository";

type Row = {
	id: string;
	employerId: string;
	employer?: { name: string; type: string } | null;
	roleId: string;
	role?: { name: string; category: string } | null;
	title: string;
	description: string;
	schedule: string | null;
	requirements: string | null;
	perks: string | null;
	salaryMinCents: bigint;
	salaryMaxCents: bigint;
	location: string;
	autoCloseOnPlacement: boolean;
	status: string;
	postedAt: Date;
	createdAt: Date;
	updatedAt: Date;
};

const toJob = (row: Row): Job => ({
	id: row.id,
	employerId: row.employerId,
	employerName: row.employer?.name,
	employerType: row.employer?.type,
	roleId: row.roleId,
	roleName: row.role?.name,
	roleCategory: row.role?.category,
	title: row.title,
	description: row.description,
	schedule: row.schedule,
	requirements: row.requirements,
	perks: row.perks,
	salaryMinCents: row.salaryMinCents,
	salaryMaxCents: row.salaryMaxCents,
	location: row.location,
	autoCloseOnPlacement: row.autoCloseOnPlacement,
	status: row.status as JobStatus,
	postedAt: row.postedAt,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

const JOB_SUMMARY_INCLUDE = {
	employer: { select: { name: true, type: true } },
	role: { select: { name: true, category: true } },
} as const;
const MAX_SEARCH_IDS = 10_000;

@Injectable()
export class PrismaJobsRepository implements IJobsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.job.findFirst({
			where: { id, deletedAt: null },
			include: JOB_SUMMARY_INCLUDE,
		});
		return row ? toJob(row as unknown as Row) : null;
	}

	async create(data: NewJob) {
		const row = await this.prisma.job.create({
			data: {
				employerId: data.employerId,
				roleId: data.roleId,
				title: data.title,
				description: data.description,
				schedule: data.schedule,
				requirements: data.requirements,
				perks: data.perks,
				salaryMinCents: data.salaryMinCents,
				salaryMaxCents: data.salaryMaxCents,
				location: data.location,
				autoCloseOnPlacement: data.autoCloseOnPlacement,
				status: data.status,
			},
			include: JOB_SUMMARY_INCLUDE,
		});
		return toJob(row as unknown as Row);
	}

	async update(id: string, patch: JobPatch) {
		const row = await this.prisma.job.update({
			where: { id },
			data: patch,
			include: JOB_SUMMARY_INCLUDE,
		});
		return toJob(row as unknown as Row);
	}

	async listByFilter(filter: JobFilter) {
		const searchQuery = normalizeSearchQuery(filter.q);
		if (searchQuery) return this.listByFullTextSearch(filter, searchQuery);

		const where = buildJobWhere(filter);
		const window = pageWindow(filter.page, filter.limit);

		const [rows, total] = await Promise.all([
			this.prisma.job.findMany({
				where,
				include: JOB_SUMMARY_INCLUDE,
				orderBy: buildJobOrderBy(filter),
				skip: window.skip,
				take: window.limit,
			}),
			this.prisma.job.count({ where }),
		]);

		return { items: rows.map((r) => toJob(r as unknown as Row)), total };
	}

	async softDelete(id: string) {
		await this.prisma.job.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	private async listByFullTextSearch(filter: JobFilter, query: string) {
		const rankedIds = await this.findRankedJobIds(query);
		if (rankedIds.length === 0) return { items: [], total: 0 };

		const allSearchIds = rankedIds.map((row) => row.id);
		const where = {
			...buildJobWhere({ ...filter, q: undefined }),
			id: { in: allSearchIds },
		} satisfies Prisma.JobWhereInput;
		const matchingIds = await this.prisma.job.findMany({ where, select: { id: true } });
		const orderedIds = intersectRankedIds(rankedIds, matchingIds);
		const window = pageWindow(filter.page, filter.limit);
		const pageIds = orderedIds.slice(window.skip, window.skip + window.limit);
		if (pageIds.length === 0) return { items: [], total: orderedIds.length };

		const rows = await this.prisma.job.findMany({
			where: { id: { in: pageIds }, deletedAt: null },
			include: JOB_SUMMARY_INCLUDE,
		});

		return {
			items: orderRowsByIdList(rows as unknown as Row[], pageIds).map((row) => toJob(row)),
			total: orderedIds.length,
		};
	}

	private async findRankedJobIds(query: string) {
		return this.prisma.$queryRaw<RankedId[]>`
			WITH search_query AS (SELECT websearch_to_tsquery('simple', ${query}) AS term)
			SELECT j.id, ts_rank_cd(
				setweight(to_tsvector('simple', coalesce(j.title, '')), 'A') ||
				setweight(to_tsvector('simple', coalesce(j.description, '')), 'B') ||
				setweight(to_tsvector('simple', coalesce(j.requirements, '')), 'B') ||
				setweight(to_tsvector('simple', coalesce(j.perks, '')), 'C') ||
				setweight(to_tsvector('simple', coalesce(e.name, '') || ' ' || coalesce(e."contactName", '')), 'C') ||
				setweight(to_tsvector('simple', coalesce(r.name, '') || ' ' || coalesce(r.category, '')), 'A'),
				search_query.term
			)::float AS rank
			FROM "job" j
			INNER JOIN "employer" e ON e.id = j."employerId"
			INNER JOIN "role" r ON r.id = j."roleId"
			CROSS JOIN search_query
			WHERE j."deletedAt" IS NULL
				AND (
					setweight(to_tsvector('simple', coalesce(j.title, '')), 'A') ||
					setweight(to_tsvector('simple', coalesce(j.description, '')), 'B') ||
					setweight(to_tsvector('simple', coalesce(j.requirements, '')), 'B') ||
					setweight(to_tsvector('simple', coalesce(j.perks, '')), 'C') ||
					setweight(to_tsvector('simple', coalesce(e.name, '') || ' ' || coalesce(e."contactName", '')), 'C') ||
					setweight(to_tsvector('simple', coalesce(r.name, '') || ' ' || coalesce(r.category, '')), 'A')
				) @@ search_query.term
			ORDER BY rank DESC, j."postedAt" DESC
			LIMIT ${MAX_SEARCH_IDS}
		`;
	}
}
