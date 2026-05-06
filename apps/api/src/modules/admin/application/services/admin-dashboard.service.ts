import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

const ACTIVE_PLACEMENT_STATUS = "active";
const OPEN_COMPLAINT_STATUSES = ["open", "mediating", "referred_external"] as const;
const OPEN_TICKET_STATUSES = ["open", "in_progress", "escalated_higher"] as const;
const FLAGGED_WORKER_STATUSES = ["notice", "warning", "suspended"] as const;
const SOFT_DELETE_FILTER = { deletedAt: null } as const;

export type AdminDashboardMetrics = {
	readonly money: {
		readonly lifetimeCommissionCents: string;
		readonly activeWagesCents: string;
	};
	readonly counts: {
		readonly totalPlacements: number;
		readonly activePlacements: number;
		readonly workers: number;
		readonly availableWorkers: number;
		readonly flaggedWorkers: number;
		readonly employers: number;
		readonly openComplaints: number;
		readonly openTickets: number;
		readonly stations: number;
		readonly activeStations: number;
	};
};

@Injectable()
export class AdminDashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getMetrics(): Promise<AdminDashboardMetrics> {
		const [
			lifetimeCommission,
			activeWages,
			totalPlacements,
			activePlacements,
			workers,
			availableWorkers,
			flaggedWorkers,
			employers,
			openComplaints,
			openTickets,
			stations,
			activeStations,
		] = await this.prisma.$transaction([
			this.prisma.placement.aggregate({ _sum: { commissionCents: true } }),
			this.prisma.placement.aggregate({
				where: { status: ACTIVE_PLACEMENT_STATUS },
				_sum: { salaryCents: true },
			}),
			this.prisma.placement.count(),
			this.prisma.placement.count({ where: { status: ACTIVE_PLACEMENT_STATUS } }),
			this.prisma.worker.count({ where: SOFT_DELETE_FILTER }),
			this.prisma.worker.count({ where: { ...SOFT_DELETE_FILTER, available: true } }),
			this.prisma.worker.count({ where: { ...SOFT_DELETE_FILTER, hopFlag: { in: [...FLAGGED_WORKER_STATUSES] } } }),
			this.prisma.employer.count({ where: SOFT_DELETE_FILTER }),
			this.prisma.complaint.count({ where: { status: { in: [...OPEN_COMPLAINT_STATUSES] } } }),
			this.prisma.ticket.count({ where: { status: { in: [...OPEN_TICKET_STATUSES] } } }),
			this.prisma.station.count(),
			this.prisma.station.count({ where: { active: true } }),
		]);

		return {
			money: {
				lifetimeCommissionCents: lifetimeCommission._sum.commissionCents?.toString() ?? "0",
				activeWagesCents: activeWages._sum.salaryCents?.toString() ?? "0",
			},
			counts: {
				totalPlacements,
				activePlacements,
				workers,
				availableWorkers,
				flaggedWorkers,
				employers,
				openComplaints,
				openTickets,
				stations,
				activeStations,
			},
		};
	}
}
