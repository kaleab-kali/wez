import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma } from "../../../../generated/prisma/client";
import type {
	Complaint,
	ComplaintFilter,
	ComplaintPartyType,
	ComplaintPatch,
	ComplaintResolutionTag,
	ComplaintSeverity,
	ComplaintStatus,
	NewComplaint,
} from "../../domain/entities/complaint.entity";
import type { IComplaintsRepository } from "../../domain/repositories/complaints.repository";

type ComplaintRow = {
	id: string;
	filedByType: string;
	filedById: string;
	filedByUserId: string | null;
	againstType: string;
	againstId: string;
	placementId: string | null;
	stationId: string | null;
	station?: { name: string } | null;
	takenByAgentId: string | null;
	takenByAgent?: { name: string; email: string } | null;
	assignedToAgentId: string | null;
	assignedToAgent?: { name: string; email: string } | null;
	type: string;
	severity: string;
	description: string;
	status: string;
	resolution: string | null;
	resolutionTag: string | null;
	externalCaseId: string | null;
	closedAt: Date | null;
	closedById: string | null;
	closedBy?: { name: string; email: string } | null;
	createdAt: Date;
	updatedAt: Date;
};

const COMPLAINT_INCLUDE = {
	station: { select: { name: true } },
	takenByAgent: { select: { name: true, email: true } },
	assignedToAgent: { select: { name: true, email: true } },
	closedBy: { select: { name: true, email: true } },
} as const;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class PrismaComplaintsRepository implements IComplaintsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.complaint.findUnique({ where: { id }, include: COMPLAINT_INCLUDE });
		const complaints = row ? await this.enrichRows([row as unknown as ComplaintRow]) : [];
		return complaints[0] ?? null;
	}

	async create(data: NewComplaint) {
		const row = await this.prisma.complaint.create({
			data: {
				filedByType: data.filedByType,
				filedById: data.filedById,
				filedByUserId: data.filedByUserId,
				againstType: data.againstType,
				againstId: data.againstId,
				placementId: data.placementId,
				stationId: data.stationId,
				takenByAgentId: data.takenByAgentId,
				assignedToAgentId: data.assignedToAgentId,
				type: data.type,
				severity: data.severity,
				description: data.description,
				status: data.status,
				resolution: data.resolution,
				resolutionTag: data.resolutionTag,
				externalCaseId: data.externalCaseId,
				closedAt: data.closedAt,
				closedById: data.closedById,
			},
			include: COMPLAINT_INCLUDE,
		});
		const complaints = await this.enrichRows([row as unknown as ComplaintRow]);
		return complaints[0] as Complaint;
	}

	async update(id: string, patch: ComplaintPatch) {
		const row = await this.prisma.complaint.update({
			where: { id },
			data: patch,
			include: COMPLAINT_INCLUDE,
		});
		const complaints = await this.enrichRows([row as unknown as ComplaintRow]);
		return complaints[0] as Complaint;
	}

	async listByFilter(filter: ComplaintFilter) {
		const page = Math.max(DEFAULT_PAGE, filter.page ?? DEFAULT_PAGE);
		const limit = Math.min(Math.max(1, filter.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
		const where = this.buildWhere(filter);
		const [rows, total] = await Promise.all([
			this.prisma.complaint.findMany({
				where,
				include: COMPLAINT_INCLUDE,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.complaint.count({ where }),
		]);

		return { items: await this.enrichRows(rows as unknown as ComplaintRow[]), total };
	}

	private buildWhere(filter: ComplaintFilter): Prisma.ComplaintWhereInput {
		const andFilters: Prisma.ComplaintWhereInput[] = [];
		if (filter.stationIds) {
			andFilters.push({ stationId: { in: [...filter.stationIds] } });
		}
		if (filter.participantType && filter.participantId) {
			andFilters.push({
				OR: [
					{ filedByType: filter.participantType, filedById: filter.participantId },
					{ againstType: filter.participantType, againstId: filter.participantId },
				],
			});
		}

		return {
			status: filter.status,
			severity: filter.severity,
			stationId: filter.stationId,
			filedByType: filter.filedByType,
			filedById: filter.filedById,
			againstType: filter.againstType,
			againstId: filter.againstId,
			AND: andFilters.length > 0 ? andFilters : undefined,
		};
	}

	private async enrichRows(rows: ComplaintRow[]): Promise<Complaint[]> {
		const workerIds = this.partyIds(rows, "worker");
		const employerIds = this.partyIds(rows, "employer");
		const [workers, employers] = await Promise.all([
			workerIds.length > 0
				? this.prisma.worker.findMany({ where: { id: { in: workerIds } }, select: { id: true, fullName: true } })
				: [],
			employerIds.length > 0
				? this.prisma.employer.findMany({ where: { id: { in: employerIds } }, select: { id: true, name: true } })
				: [],
		]);
		const workerNames = new Map(workers.map((worker) => [worker.id, worker.fullName]));
		const employerNames = new Map(employers.map((employer) => [employer.id, employer.name]));

		return rows.map((row) => ({
			id: row.id,
			filedByType: row.filedByType as ComplaintPartyType,
			filedById: row.filedById,
			filedByName: this.partyName(row.filedByType, row.filedById, workerNames, employerNames),
			filedByUserId: row.filedByUserId,
			againstType: row.againstType as ComplaintPartyType,
			againstId: row.againstId,
			againstName: this.partyName(row.againstType, row.againstId, workerNames, employerNames),
			placementId: row.placementId,
			stationId: row.stationId,
			stationName: row.station?.name ?? null,
			takenByAgentId: row.takenByAgentId,
			takenByAgentName: row.takenByAgent?.name ?? row.takenByAgent?.email ?? null,
			assignedToAgentId: row.assignedToAgentId,
			assignedToAgentName: row.assignedToAgent?.name ?? row.assignedToAgent?.email ?? null,
			type: row.type,
			severity: row.severity as ComplaintSeverity,
			description: row.description,
			status: row.status as ComplaintStatus,
			resolution: row.resolution,
			resolutionTag: row.resolutionTag as ComplaintResolutionTag | null,
			externalCaseId: row.externalCaseId,
			closedAt: row.closedAt,
			closedById: row.closedById,
			closedByName: row.closedBy?.name ?? row.closedBy?.email ?? null,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}));
	}

	private partyIds(rows: readonly ComplaintRow[], partyType: ComplaintPartyType): string[] {
		const ids = rows.flatMap((row) => [
			row.filedByType === partyType ? row.filedById : undefined,
			row.againstType === partyType ? row.againstId : undefined,
		]);
		return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
	}

	private partyName(
		partyType: string,
		partyId: string,
		workerNames: ReadonlyMap<string, string>,
		employerNames: ReadonlyMap<string, string>,
	): string | undefined {
		return partyType === "worker" ? workerNames.get(partyId) : employerNames.get(partyId);
	}
}
