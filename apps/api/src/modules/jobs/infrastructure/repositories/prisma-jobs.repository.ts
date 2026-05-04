import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Job, JobFilter, JobPatch, JobStatus, NewJob } from "../../domain/entities/job.entity";
import type { IJobsRepository } from "../../domain/repositories/jobs.repository";

type Row = {
	id: string;
	employerId: string;
	roleId: string;
	title: string;
	description: string;
	salaryMinCents: bigint;
	salaryMaxCents: bigint;
	location: string;
	status: string;
	postedAt: Date;
	createdAt: Date;
	updatedAt: Date;
};

const toJob = (row: Row): Job => ({
	id: row.id,
	employerId: row.employerId,
	roleId: row.roleId,
	title: row.title,
	description: row.description,
	salaryMinCents: row.salaryMinCents,
	salaryMaxCents: row.salaryMaxCents,
	location: row.location,
	status: row.status as JobStatus,
	postedAt: row.postedAt,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaJobsRepository implements IJobsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.job.findFirst({ where: { id, deletedAt: null } });
		return row ? toJob(row as unknown as Row) : null;
	}

	async create(data: NewJob) {
		const row = await this.prisma.job.create({
			data: {
				employerId: data.employerId,
				roleId: data.roleId,
				title: data.title,
				description: data.description,
				salaryMinCents: data.salaryMinCents,
				salaryMaxCents: data.salaryMaxCents,
				location: data.location,
				status: data.status,
			},
		});
		return toJob(row as unknown as Row);
	}

	async update(id: string, patch: JobPatch) {
		const row = await this.prisma.job.update({ where: { id }, data: patch });
		return toJob(row as unknown as Row);
	}

	async listByFilter(filter: JobFilter) {
		const where: Record<string, unknown> = { deletedAt: null };
		if (filter.q) {
			where.OR = [
				{ title: { contains: filter.q, mode: "insensitive" } },
				{ description: { contains: filter.q, mode: "insensitive" } },
			];
		}
		if (filter.roleId) where.roleId = filter.roleId;
		if (filter.location) where.location = filter.location;
		if (filter.status) where.status = filter.status;
		if (filter.employerId) where.employerId = filter.employerId;

		const page = Math.max(1, filter.page ?? 1);
		const limit = Math.min(Math.max(1, filter.limit ?? 20), 100);

		const [rows, total] = await Promise.all([
			this.prisma.job.findMany({
				where: where as never,
				orderBy: { postedAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.job.count({ where: where as never }),
		]);

		return { items: rows.map((r) => toJob(r as unknown as Row)), total };
	}

	async softDelete(id: string) {
		await this.prisma.job.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
