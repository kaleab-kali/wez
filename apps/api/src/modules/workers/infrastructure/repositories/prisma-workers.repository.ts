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
import { buildWorkerOrderBy, buildWorkerWhere } from "../../application/specifications/worker-filter.specification";
import type {
	Gender,
	HopFlag,
	NewWorker,
	Worker,
	WorkerFilter,
	WorkerPatch,
	WorkerTier,
} from "../../domain/entities/worker.entity";
import type { IWorkersRepository } from "../../domain/repositories/workers.repository";

type Row = {
	id: string;
	userId: string | null;
	fullName: string;
	fayda: string;
	phone: string;
	dateOfBirth: Date | null;
	gender: string;
	area: string;
	bio: string | null;
	religion: string | null;
	languages: string[];
	experienceYears: number;
	tier: string;
	hopFlag: string;
	hasHealthCard: boolean;
	hasPoliceClearance: boolean;
	tin: string | null;
	available: boolean;
	registeredByAgentId: string | null;
	registeredAtStationId: string | null;
	registeringStation?: { name: string } | null;
	ratingAverage: { toNumber(): number } | null;
	placementsCount: number;
	photoAttachmentId: string | null;
	createdAt: Date;
	updatedAt: Date;
	workerRoles?: { roleId: string }[];
};

const toWorker = (row: Row): Worker => ({
	id: row.id,
	userId: row.userId,
	fullName: row.fullName,
	fayda: row.fayda,
	phone: row.phone,
	dateOfBirth: row.dateOfBirth,
	gender: row.gender as Gender,
	area: row.area,
	bio: row.bio,
	religion: row.religion,
	languages: row.languages,
	experienceYears: row.experienceYears,
	tier: row.tier as WorkerTier,
	hopFlag: row.hopFlag as HopFlag,
	hasHealthCard: row.hasHealthCard,
	hasPoliceClearance: row.hasPoliceClearance,
	tin: row.tin,
	available: row.available,
	registeredByAgentId: row.registeredByAgentId,
	registeredAtStationId: row.registeredAtStationId,
	registeredAtStationName: row.registeringStation?.name ?? null,
	ratingAverage: row.ratingAverage ? row.ratingAverage.toNumber() : null,
	placementsCount: row.placementsCount,
	photoAttachmentId: row.photoAttachmentId,
	roles: row.workerRoles?.map((r) => r.roleId) ?? [],
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});
const MAX_SEARCH_IDS = 10_000;
const WORKER_LIST_INCLUDE = { workerRoles: true, registeringStation: { select: { name: true } } } as const;

@Injectable()
export class PrismaWorkersRepository implements IWorkersRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.worker.findFirst({
			where: { id, deletedAt: null },
			include: { workerRoles: true, registeringStation: { select: { name: true } } },
		});
		return row ? toWorker(row as unknown as Row) : null;
	}

	async findByUserId(userId: string) {
		const row = await this.prisma.worker.findFirst({
			where: { userId, deletedAt: null },
			include: { workerRoles: true, registeringStation: { select: { name: true } } },
		});
		return row ? toWorker(row as unknown as Row) : null;
	}

	async findByFayda(fayda: string) {
		const row = await this.prisma.worker.findFirst({
			where: { fayda, deletedAt: null },
			include: { workerRoles: true, registeringStation: { select: { name: true } } },
		});
		return row ? toWorker(row as unknown as Row) : null;
	}

	async findByPhone(phone: string) {
		const row = await this.prisma.worker.findFirst({
			where: { phone, deletedAt: null },
			include: { workerRoles: true, registeringStation: { select: { name: true } } },
		});
		return row ? toWorker(row as unknown as Row) : null;
	}

	async create(data: NewWorker) {
		const row = await this.prisma.worker.create({
			data: {
				userId: data.userId,
				fullName: data.fullName,
				fayda: data.fayda,
				phone: data.phone,
				dateOfBirth: data.dateOfBirth,
				gender: data.gender,
				area: data.area,
				bio: data.bio,
				religion: data.religion,
				languages: data.languages,
				experienceYears: data.experienceYears,
				hasHealthCard: data.hasHealthCard,
				hasPoliceClearance: data.hasPoliceClearance,
				tin: data.tin,
				registeredByAgentId: data.registeredByAgentId,
				registeredAtStationId: data.registeredAtStationId,
				workerRoles: { create: data.roles.map((roleId) => ({ roleId })) },
			},
			include: { workerRoles: true, registeringStation: { select: { name: true } } },
		});
		return toWorker(row as unknown as Row);
	}

	async update(id: string, patch: WorkerPatch) {
		const { roles, ...rest } = patch;
		const updated = await this.prisma.$transaction(async (tx) => {
			await tx.worker.update({ where: { id }, data: rest });
			if (roles) {
				await tx.workerRole.deleteMany({ where: { workerId: id } });
				if (roles.length > 0) {
					await tx.workerRole.createMany({
						data: roles.map((roleId) => ({ workerId: id, roleId })),
					});
				}
			}
			return tx.worker.findUniqueOrThrow({
				where: { id },
				include: { workerRoles: true, registeringStation: { select: { name: true } } },
			});
		});
		return toWorker(updated as unknown as Row);
	}

	async listByFilter(filter: WorkerFilter) {
		const searchQuery = normalizeSearchQuery(filter.q);
		if (searchQuery) return this.listByFullTextSearch(filter, searchQuery);

		const where = buildWorkerWhere(filter);
		const orderBy = buildWorkerOrderBy(filter);
		const window = pageWindow(filter.page, filter.limit);

		const [rows, total] = await Promise.all([
			this.prisma.worker.findMany({
				where,
				orderBy,
				skip: window.skip,
				take: window.limit,
				include: WORKER_LIST_INCLUDE,
			}),
			this.prisma.worker.count({ where }),
		]);

		return { items: rows.map((r) => toWorker(r as unknown as Row)), total };
	}

	async softDelete(id: string) {
		await this.prisma.worker.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	private async listByFullTextSearch(filter: WorkerFilter, query: string) {
		const rankedIds = await this.findRankedWorkerIds(query);
		if (rankedIds.length === 0) return { items: [], total: 0 };

		const allSearchIds = rankedIds.map((row) => row.id);
		const where = {
			...buildWorkerWhere({ ...filter, q: undefined }),
			id: { in: allSearchIds },
		} satisfies Prisma.WorkerWhereInput;
		const matchingIds = await this.prisma.worker.findMany({ where, select: { id: true } });
		const orderedIds = intersectRankedIds(rankedIds, matchingIds);
		const window = pageWindow(filter.page, filter.limit);
		const pageIds = orderedIds.slice(window.skip, window.skip + window.limit);
		if (pageIds.length === 0) return { items: [], total: orderedIds.length };

		const rows = await this.prisma.worker.findMany({
			where: { id: { in: pageIds }, deletedAt: null },
			include: WORKER_LIST_INCLUDE,
		});

		return {
			items: orderRowsByIdList(rows as unknown as Row[], pageIds).map((row) => toWorker(row)),
			total: orderedIds.length,
		};
	}

	private async findRankedWorkerIds(query: string) {
		return this.prisma.$queryRaw<RankedId[]>`
			WITH search_query AS (SELECT websearch_to_tsquery('simple', ${query}) AS term)
			SELECT w.id, MAX(ts_rank_cd(
				setweight(to_tsvector('simple', coalesce(w."fullName", '')), 'A') ||
				setweight(to_tsvector('simple', coalesce(w.bio, '')), 'B') ||
				setweight(to_tsvector('simple', coalesce(w.phone, '')), 'B') ||
				setweight(to_tsvector('simple', coalesce(array_to_string(w.languages, ' '), '')), 'C') ||
				setweight(to_tsvector('simple', coalesce(r.name, '') || ' ' || coalesce(r.category, '')), 'A'),
				search_query.term
			))::float AS rank
			FROM "worker" w
			LEFT JOIN "worker_role" wr ON wr."workerId" = w.id
			LEFT JOIN "role" r ON r.id = wr."roleId"
			CROSS JOIN search_query
			WHERE w."deletedAt" IS NULL
				AND (
					setweight(to_tsvector('simple', coalesce(w."fullName", '')), 'A') ||
					setweight(to_tsvector('simple', coalesce(w.bio, '')), 'B') ||
					setweight(to_tsvector('simple', coalesce(w.phone, '')), 'B') ||
					setweight(to_tsvector('simple', coalesce(array_to_string(w.languages, ' '), '')), 'C') ||
					setweight(to_tsvector('simple', coalesce(r.name, '') || ' ' || coalesce(r.category, '')), 'A')
				) @@ search_query.term
			GROUP BY w.id
			ORDER BY rank DESC, w."createdAt" DESC
			LIMIT ${MAX_SEARCH_IDS}
		`;
	}
}
