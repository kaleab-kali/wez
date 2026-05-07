import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type {
	NewReferral,
	Referral,
	ReferralFilter,
	ReferralPatch,
	ReferralStatus,
} from "../../domain/entities/referral.entity";
import type { IReferralsRepository } from "../../domain/repositories/referrals.repository";

type Row = {
	id: string;
	workerId: string;
	worker?: { fullName: string } | null;
	employerId: string;
	employer?: { name: string } | null;
	jobId: string | null;
	agentId: string;
	note: string | null;
	status: string;
	declineReason: string | null;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
};

const REFERRAL_INCLUDE = {
	worker: { select: { fullName: true } },
	employer: { select: { name: true } },
} as const;

const toReferral = (row: Row): Referral => ({
	id: row.id,
	workerId: row.workerId,
	workerName: row.worker?.fullName,
	employerId: row.employerId,
	employerName: row.employer?.name,
	jobId: row.jobId,
	jobTitle: null,
	agentId: row.agentId,
	note: row.note,
	status: row.status as ReferralStatus,
	declineReason: row.declineReason,
	expiresAt: row.expiresAt,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaReferralsRepository implements IReferralsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.referral.findUnique({ where: { id }, include: REFERRAL_INCLUDE });
		return row ? toReferral(row as unknown as Row) : null;
	}

	async create(data: NewReferral) {
		const row = await this.prisma.referral.create({
			data: {
				workerId: data.workerId,
				employerId: data.employerId,
				jobId: data.jobId,
				agentId: data.agentId,
				note: data.note,
				status: data.status,
				expiresAt: data.expiresAt,
			},
			include: REFERRAL_INCLUDE,
		});
		return toReferral(row as unknown as Row);
	}

	async update(id: string, patch: ReferralPatch) {
		const row = await this.prisma.referral.update({ where: { id }, data: patch, include: REFERRAL_INCLUDE });
		return toReferral(row as unknown as Row);
	}

	async listByFilter(filter: ReferralFilter) {
		const where: Record<string, unknown> = {};
		if (filter.employerId) where.employerId = filter.employerId;
		if (filter.workerId) where.workerId = filter.workerId;
		if (filter.status) where.status = filter.status;

		const page = Math.max(1, filter.page ?? 1);
		const limit = Math.min(Math.max(1, filter.limit ?? 20), 100);
		const [rows, total] = await Promise.all([
			this.prisma.referral.findMany({
				where: where as never,
				include: REFERRAL_INCLUDE,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.referral.count({ where: where as never }),
		]);
		return { items: rows.map((row) => toReferral(row as unknown as Row)), total };
	}

	async listExpiringBefore(when: Date) {
		const rows = await this.prisma.referral.findMany({
			where: { status: "pending_employer", expiresAt: { lte: when } },
			include: REFERRAL_INCLUDE,
		});
		return rows.map((row) => toReferral(row as unknown as Row));
	}
}
