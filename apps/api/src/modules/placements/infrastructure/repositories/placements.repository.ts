import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { ListPlacementsDto } from "../../application/dto/placement.dto";

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

	async list(filter: ListPlacementsDto) {
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		const where = {
			status: filter.status,
			workerId: filter.workerId,
			employerId: filter.employerId,
			stationId: filter.stationId,
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
