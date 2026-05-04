import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type {
	HireRequest,
	HireRequestChannel,
	HireRequestFilter,
	HireRequestPatch,
	HireRequestStatus,
	NewHireRequest,
} from "../../domain/entities/hire-request.entity";
import type { IHireRequestsRepository } from "../../domain/repositories/hire-requests.repository";

type Row = {
	id: string;
	employerId: string;
	workerId: string;
	roleId: string;
	jobId: string | null;
	proposedSalaryCents: bigint;
	stationId: string;
	status: string;
	channel: string;
	note: string | null;
	sourceReferralId: string | null;
	expiresAt: Date;
	completedAt: Date | null;
	cancelledAt: Date | null;
	cancellationReason: string | null;
	createdAt: Date;
	updatedAt: Date;
};

const toReq = (row: Row): HireRequest => ({
	id: row.id,
	employerId: row.employerId,
	workerId: row.workerId,
	roleId: row.roleId,
	jobId: row.jobId,
	proposedSalaryCents: row.proposedSalaryCents,
	stationId: row.stationId,
	status: row.status as HireRequestStatus,
	channel: row.channel as HireRequestChannel,
	note: row.note,
	sourceReferralId: row.sourceReferralId,
	expiresAt: row.expiresAt,
	completedAt: row.completedAt,
	cancelledAt: row.cancelledAt,
	cancellationReason: row.cancellationReason,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaHireRequestsRepository implements IHireRequestsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.hireRequest.findUnique({ where: { id } });
		return row ? toReq(row as unknown as Row) : null;
	}

	async create(data: NewHireRequest) {
		const row = await this.prisma.hireRequest.create({
			data: {
				employerId: data.employerId,
				workerId: data.workerId,
				roleId: data.roleId,
				jobId: data.jobId,
				proposedSalaryCents: data.proposedSalaryCents,
				stationId: data.stationId,
				status: data.status,
				channel: data.channel,
				note: data.note,
				sourceReferralId: data.sourceReferralId,
				expiresAt: data.expiresAt,
			},
		});
		return toReq(row as unknown as Row);
	}

	async update(id: string, patch: HireRequestPatch) {
		const row = await this.prisma.hireRequest.update({ where: { id }, data: patch });
		return toReq(row as unknown as Row);
	}

	async listByFilter(filter: HireRequestFilter) {
		const where: Record<string, unknown> = {};
		if (filter.employerId) where.employerId = filter.employerId;
		if (filter.workerId) where.workerId = filter.workerId;
		if (filter.stationId) where.stationId = filter.stationId;
		if (filter.status) where.status = filter.status;

		const page = Math.max(1, filter.page ?? 1);
		const limit = Math.min(Math.max(1, filter.limit ?? 20), 100);

		const [rows, total] = await Promise.all([
			this.prisma.hireRequest.findMany({
				where: where as never,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.hireRequest.count({ where: where as never }),
		]);

		return { items: rows.map((r) => toReq(r as unknown as Row)), total };
	}

	async listExpiringBefore(when: Date) {
		const rows = await this.prisma.hireRequest.findMany({
			where: { status: "awaiting_visit", expiresAt: { lt: when } },
		});
		return rows.map((r) => toReq(r as unknown as Row));
	}
}
