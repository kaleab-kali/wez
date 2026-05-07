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
	employer?: { name: string } | null;
	workerId: string;
	worker?: { fullName: string } | null;
	roleId: string;
	role?: {
		name: string;
		commType: string;
		commValue: number;
		salaryMinCents: bigint;
		salaryMaxCents: bigint;
	} | null;
	jobId: string | null;
	proposedSalaryCents: bigint;
	stationId: string;
	station?: { name: string } | null;
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

const HIRE_REQUEST_SUMMARY_INCLUDE = {
	employer: { select: { name: true } },
	worker: { select: { fullName: true } },
	role: {
		select: {
			name: true,
			commType: true,
			commValue: true,
			salaryMinCents: true,
			salaryMaxCents: true,
		},
	},
	station: { select: { name: true } },
} as const;

const toReq = (row: Row): HireRequest => ({
	id: row.id,
	employerId: row.employerId,
	employerName: row.employer?.name,
	workerId: row.workerId,
	workerName: row.worker?.fullName,
	roleId: row.roleId,
	roleName: row.role?.name,
	roleCommType: row.role?.commType as "flat" | "percent" | undefined,
	roleCommValue: row.role?.commValue,
	roleSalaryMinCents: row.role?.salaryMinCents,
	roleSalaryMaxCents: row.role?.salaryMaxCents,
	jobId: row.jobId,
	proposedSalaryCents: row.proposedSalaryCents,
	stationId: row.stationId,
	stationName: row.station?.name,
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
		const row = await this.prisma.hireRequest.findUnique({
			where: { id },
			include: HIRE_REQUEST_SUMMARY_INCLUDE,
		});
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
			include: HIRE_REQUEST_SUMMARY_INCLUDE,
		});
		return toReq(row as unknown as Row);
	}

	async update(id: string, patch: HireRequestPatch) {
		const row = await this.prisma.hireRequest.update({
			where: { id },
			data: patch,
			include: HIRE_REQUEST_SUMMARY_INCLUDE,
		});
		return toReq(row as unknown as Row);
	}

	async listByFilter(filter: HireRequestFilter) {
		const where: Record<string, unknown> = {};
		if (filter.employerId) where.employerId = filter.employerId;
		if (filter.workerId) where.workerId = filter.workerId;
		if (filter.stationId) where.stationId = filter.stationId;
		if (!filter.stationId && filter.stationIds) where.stationId = { in: filter.stationIds };
		if (filter.status) where.status = filter.status;

		const page = Math.max(1, filter.page ?? 1);
		const limit = Math.min(Math.max(1, filter.limit ?? 20), 100);

		const [rows, total] = await Promise.all([
			this.prisma.hireRequest.findMany({
				where: where as never,
				include: HIRE_REQUEST_SUMMARY_INCLUDE,
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
