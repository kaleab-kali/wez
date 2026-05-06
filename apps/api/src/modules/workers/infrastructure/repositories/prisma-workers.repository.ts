import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
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
	ratingAverage: row.ratingAverage ? row.ratingAverage.toNumber() : null,
	placementsCount: row.placementsCount,
	photoAttachmentId: row.photoAttachmentId,
	roles: row.workerRoles?.map((r) => r.roleId) ?? [],
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaWorkersRepository implements IWorkersRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.worker.findFirst({
			where: { id, deletedAt: null },
			include: { workerRoles: true },
		});
		return row ? toWorker(row as unknown as Row) : null;
	}

	async findByFayda(fayda: string) {
		const row = await this.prisma.worker.findFirst({
			where: { fayda, deletedAt: null },
			include: { workerRoles: true },
		});
		return row ? toWorker(row as unknown as Row) : null;
	}

	async findByPhone(phone: string) {
		const row = await this.prisma.worker.findFirst({
			where: { phone, deletedAt: null },
			include: { workerRoles: true },
		});
		return row ? toWorker(row as unknown as Row) : null;
	}

	async create(data: NewWorker) {
		const row = await this.prisma.worker.create({
			data: {
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
			include: { workerRoles: true },
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
				include: { workerRoles: true },
			});
		});
		return toWorker(updated as unknown as Row);
	}

	async listByFilter(filter: WorkerFilter) {
		const where = buildWorkerWhere(filter);
		const orderBy = buildWorkerOrderBy(filter);
		const page = Math.max(1, filter.page ?? 1);
		const limit = Math.min(Math.max(1, filter.limit ?? 20), 100);

		const [rows, total] = await Promise.all([
			this.prisma.worker.findMany({
				where,
				orderBy,
				skip: (page - 1) * limit,
				take: limit,
				include: { workerRoles: true },
			}),
			this.prisma.worker.count({ where }),
		]);

		return { items: rows.map((r) => toWorker(r as unknown as Row)), total };
	}

	async softDelete(id: string) {
		await this.prisma.worker.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
