import type { Prisma } from "../../../../generated/prisma/client";
import type { HopFlag, WorkerFilter, WorkerTier } from "../../domain/entities/worker.entity";

const TIER_RANK: Record<WorkerTier, number> = { basic: 0, verified: 1, trained: 2, trusted: 3 };
const TIER_AT_OR_ABOVE = (min: WorkerTier): WorkerTier[] => {
	const minRank = TIER_RANK[min];
	return (Object.keys(TIER_RANK) as WorkerTier[]).filter((t) => TIER_RANK[t] >= minRank);
};

const NON_FLAGGED: HopFlag[] = ["none", "notice"];

export const buildWorkerWhere = (f: WorkerFilter): Prisma.WorkerWhereInput => {
	const where: Prisma.WorkerWhereInput = { deletedAt: null };

	if (f.q && f.q.trim().length > 0) {
		const term = f.q.trim();
		where.OR = [
			{ fullName: { contains: term, mode: "insensitive" } },
			{ bio: { contains: term, mode: "insensitive" } },
			{ phone: { contains: term } },
		];
	}

	if (f.roleId) {
		where.workerRoles = { some: { roleId: f.roleId } };
	}

	if (f.woreda) {
		where.area = { equals: f.woreda, mode: "insensitive" };
	}

	if (f.minTier) {
		where.tier = { in: TIER_AT_OR_ABOVE(f.minTier) };
	}

	if (f.gender) {
		where.gender = f.gender;
	}

	if (f.language) {
		where.languages = { has: f.language };
	}

	if (f.religion) {
		where.religion = f.religion;
	}

	if (f.minExperience !== undefined) {
		where.experienceYears = { gte: f.minExperience };
	}

	if (f.hasHealthCard !== undefined) {
		where.hasHealthCard = f.hasHealthCard;
	}

	if (f.hasPoliceClearance !== undefined) {
		where.hasPoliceClearance = f.hasPoliceClearance;
	}

	if (f.hideFlagged) {
		where.hopFlag = { in: NON_FLAGGED };
	}

	if (f.availableOnly) {
		where.available = true;
	}

	if (f.registeredAtStationIds) {
		where.registeredAtStationId = { in: f.registeredAtStationIds };
	}

	return where;
};

const ORDER_FIELD: Record<NonNullable<WorkerFilter["sortBy"]>, string> = {
	createdAt: "createdAt",
	rating: "ratingAverage",
	tier: "tier",
	experienceYears: "experienceYears",
	placementsCount: "placementsCount",
};

export const buildWorkerOrderBy = (f: WorkerFilter): Prisma.WorkerOrderByWithRelationInput => {
	const field = ORDER_FIELD[f.sortBy ?? "createdAt"] ?? "createdAt";
	const dir = f.sortOrder ?? "desc";
	return { [field]: dir } as Prisma.WorkerOrderByWithRelationInput;
};
