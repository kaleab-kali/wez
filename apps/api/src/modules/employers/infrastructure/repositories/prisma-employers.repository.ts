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
import type {
	Employer,
	EmployerFilter,
	EmployerPatch,
	EmployerRating,
	EmployerType,
	NewEmployer,
} from "../../domain/entities/employer.entity";
import type { IEmployersRepository } from "../../domain/repositories/employers.repository";

type Row = {
	id: string;
	userId: string | null;
	type: string;
	name: string;
	contactName: string | null;
	phone: string;
	email: string | null;
	area: string;
	tin: string | null;
	businessLicense: string | null;
	businessLicenseExpiresAt: Date | null;
	businessAddress: string | null;
	businessCategory: string | null;
	fayda: string | null;
	secondaryContact: string | null;
	rating: string;
	placementsCount: number;
	complaintsCount: number;
	registeredByAgentId: string | null;
	createdAt: Date;
	updatedAt: Date;
};

const toEmployer = (row: Row): Employer => ({
	id: row.id,
	userId: row.userId,
	type: row.type as EmployerType,
	name: row.name,
	contactName: row.contactName,
	phone: row.phone,
	email: row.email,
	area: row.area,
	tin: row.tin,
	businessLicense: row.businessLicense,
	businessLicenseExpiresAt: row.businessLicenseExpiresAt,
	businessAddress: row.businessAddress,
	businessCategory: row.businessCategory,
	fayda: row.fayda,
	secondaryContact: row.secondaryContact,
	rating: row.rating as EmployerRating,
	placementsCount: row.placementsCount,
	complaintsCount: row.complaintsCount,
	registeredByAgentId: row.registeredByAgentId,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});
const MAX_SEARCH_IDS = 10_000;

@Injectable()
export class PrismaEmployersRepository implements IEmployersRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.employer.findFirst({ where: { id, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async findByUserId(userId: string) {
		const row = await this.prisma.employer.findFirst({ where: { userId, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async findByTin(tin: string) {
		const row = await this.prisma.employer.findFirst({ where: { tin, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async findByPhone(phone: string) {
		const row = await this.prisma.employer.findFirst({ where: { phone, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async create(data: NewEmployer) {
		const row = await this.prisma.employer.create({
			data: {
				userId: data.userId,
				type: data.type,
				name: data.name,
				contactName: data.contactName,
				phone: data.phone,
				email: data.email,
				area: data.area,
				tin: data.tin,
				businessLicense: data.businessLicense,
				businessLicenseExpiresAt: data.businessLicenseExpiresAt,
				businessAddress: data.businessAddress,
				businessCategory: data.businessCategory,
				fayda: data.fayda,
				secondaryContact: data.secondaryContact,
				registeredByAgentId: data.registeredByAgentId,
			},
		});
		return toEmployer(row as unknown as Row);
	}

	async update(id: string, patch: EmployerPatch) {
		const row = await this.prisma.employer.update({ where: { id }, data: patch });
		return toEmployer(row as unknown as Row);
	}

	async listByFilter(filter: EmployerFilter) {
		const searchQuery = normalizeSearchQuery(filter.q);
		if (searchQuery) return this.listByFullTextSearch(filter, searchQuery);

		const where = this.buildWhere(filter);
		const window = pageWindow(filter.page, filter.limit);

		const [rows, total] = await Promise.all([
			this.prisma.employer.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: window.skip,
				take: window.limit,
			}),
			this.prisma.employer.count({ where }),
		]);

		return { items: rows.map((r) => toEmployer(r as unknown as Row)), total };
	}

	async softDelete(id: string) {
		await this.prisma.employer.update({ where: { id }, data: { deletedAt: new Date() } });
	}

	private buildWhere(filter: EmployerFilter): Prisma.EmployerWhereInput {
		const where: Prisma.EmployerWhereInput = { deletedAt: null };
		if (filter.type) where.type = filter.type;
		if (filter.rating) where.rating = filter.rating;
		if (filter.area) where.area = filter.area;
		if (filter.registeredByAgentIds) where.registeredByAgentId = { in: filter.registeredByAgentIds };
		return where;
	}

	private async listByFullTextSearch(filter: EmployerFilter, query: string) {
		const rankedIds = await this.findRankedEmployerIds(query);
		if (rankedIds.length === 0) return { items: [], total: 0 };

		const allSearchIds = rankedIds.map((row) => row.id);
		const where = {
			...this.buildWhere({ ...filter, q: undefined }),
			id: { in: allSearchIds },
		} satisfies Prisma.EmployerWhereInput;
		const matchingIds = await this.prisma.employer.findMany({ where, select: { id: true } });
		const orderedIds = intersectRankedIds(rankedIds, matchingIds);
		const window = pageWindow(filter.page, filter.limit);
		const pageIds = orderedIds.slice(window.skip, window.skip + window.limit);
		if (pageIds.length === 0) return { items: [], total: orderedIds.length };

		const rows = await this.prisma.employer.findMany({ where: { id: { in: pageIds }, deletedAt: null } });

		return {
			items: orderRowsByIdList(rows as unknown as Row[], pageIds).map((row) => toEmployer(row)),
			total: orderedIds.length,
		};
	}

	private async findRankedEmployerIds(query: string) {
		return this.prisma.$queryRaw<RankedId[]>`
			WITH search_query AS (SELECT websearch_to_tsquery('simple', ${query}) AS term)
			SELECT e.id, ts_rank_cd(
				setweight(to_tsvector('simple', coalesce(e.name, '')), 'A') ||
				setweight(to_tsvector('simple', coalesce(e."contactName", '')), 'A') ||
				setweight(to_tsvector('simple', coalesce(e.phone, '')), 'B') ||
				setweight(to_tsvector('simple', coalesce(e.email, '')), 'B') ||
				setweight(to_tsvector('simple', coalesce(e.area, '')), 'C') ||
				setweight(to_tsvector('simple', coalesce(e."businessCategory", '')), 'C'),
				search_query.term
			)::float AS rank
			FROM "employer" e
			CROSS JOIN search_query
			WHERE e."deletedAt" IS NULL
				AND (
					setweight(to_tsvector('simple', coalesce(e.name, '')), 'A') ||
					setweight(to_tsvector('simple', coalesce(e."contactName", '')), 'A') ||
					setweight(to_tsvector('simple', coalesce(e.phone, '')), 'B') ||
					setweight(to_tsvector('simple', coalesce(e.email, '')), 'B') ||
					setweight(to_tsvector('simple', coalesce(e.area, '')), 'C') ||
					setweight(to_tsvector('simple', coalesce(e."businessCategory", '')), 'C')
				) @@ search_query.term
			ORDER BY rank DESC, e."createdAt" DESC
			LIMIT ${MAX_SEARCH_IDS}
		`;
	}
}
