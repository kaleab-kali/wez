import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { ListPlacementsDto } from "../../application/dto/placement.dto";

type PlacementListFilter = ListPlacementsDto & {
	readonly stationIds?: string[];
};

@Injectable()
export class PlacementsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findWorkerIdByUserId(userId: string): Promise<string | null> {
		const worker = await this.prisma.worker.findUnique({
			where: { userId },
			select: { id: true },
		});
		return worker?.id ?? null;
	}

	async findEmployerIdByUserId(userId: string): Promise<string | null> {
		const employer = await this.prisma.employer.findUnique({
			where: { userId },
			select: { id: true },
		});
		return employer?.id ?? null;
	}

	async activeAgentStationIds(userId: string): Promise<string[]> {
		const assignments = await this.prisma.agentAssignment.findMany({
			where: { userId, active: true, removedAt: null },
			select: { stationId: true },
		});
		return assignments.map((assignment) => assignment.stationId);
	}

	async supervisedStationIds(userId: string): Promise<string[]> {
		const stations = await this.prisma.station.findMany({
			where: { supervisorUserId: userId },
			select: { id: true },
		});
		return stations.map((station) => station.id);
	}

	async list(filter: PlacementListFilter) {
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		const where = {
			status: filter.status,
			workerId: filter.workerId,
			employerId: filter.employerId,
			stationId: filter.stationId ?? (filter.stationIds ? { in: filter.stationIds } : undefined),
		};
		const [items, total] = await this.prisma.$transaction([
			this.prisma.placement.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
				include: {
					worker: { select: { fullName: true, phone: true, area: true } },
					employer: { select: { name: true, type: true, phone: true, rating: true } },
					role: {
						select: {
							name: true,
							category: true,
							commType: true,
							commValue: true,
							salaryMinCents: true,
							salaryMaxCents: true,
						},
					},
					station: { select: { name: true, woreda: true } },
					finalizedByAgent: { select: { name: true, email: true } },
					hireRequest: { select: { job: { select: { id: true, title: true, location: true } } } },
				},
			}),
			this.prisma.placement.count({ where }),
		]);
		return { items, total, page, limit };
	}
}
