import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

const ACTIVE_PLACEMENT_STATUS = "active";
const OPEN_COMPLAINT_STATUSES = ["open", "mediating", "referred_external"] as const;
const OPEN_TICKET_STATUSES = ["open", "in_progress", "escalated_higher"] as const;
const FLAGGED_WORKER_STATUSES = ["notice", "warning", "suspended"] as const;
const SOFT_DELETE_FILTER = { deletedAt: null } as const;
const TOP_ROLE_LIMIT = 8;
const PLACEMENT_CATEGORY_LIMIT = 8;
const STATION_PERFORMANCE_LIMIT = 8;
const WORKER_LOCATION_LIMIT = 10;

type CountChartPoint = {
	readonly key: string;
	readonly label: string;
	readonly count: number;
};

type StationPerformancePoint = {
	readonly stationId: string;
	readonly stationName: string;
	readonly placements: number;
	readonly complaints: number;
};

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
	readonly charts: {
		readonly topRoles: readonly CountChartPoint[];
		readonly placementsByCategory: readonly CountChartPoint[];
		readonly stationPerformance: readonly StationPerformancePoint[];
		readonly tierDistribution: readonly CountChartPoint[];
		readonly genderSplit: readonly CountChartPoint[];
		readonly workersByWoreda: readonly CountChartPoint[];
	};
};

type SummaryMetrics = Omit<AdminDashboardMetrics, "charts">;

@Injectable()
export class AdminDashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getMetrics(): Promise<AdminDashboardMetrics> {
		const [summary, charts] = await Promise.all([this.getSummaryMetrics(), this.getChartMetrics()]);
		return { ...summary, charts };
	}

	private async getSummaryMetrics(): Promise<SummaryMetrics> {
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

	private async getChartMetrics(): Promise<AdminDashboardMetrics["charts"]> {
		const [topRoles, placementsByCategory, stationPerformance, tierDistribution, genderSplit, workersByWoreda] =
			await Promise.all([
				this.getTopRoles(),
				this.getPlacementsByCategory(),
				this.getStationPerformance(),
				this.getTierDistribution(),
				this.getGenderSplit(),
				this.getWorkersByWoreda(),
			]);

		return { topRoles, placementsByCategory, stationPerformance, tierDistribution, genderSplit, workersByWoreda };
	}

	private async getTopRoles(): Promise<readonly CountChartPoint[]> {
		const roleGroups = await this.prisma.placement.groupBy({
			by: ["roleId"],
			_count: { id: true },
		});
		const topGroups = this.sortCounts(
			roleGroups.map((group) => ({ key: group.roleId, count: group._count.id })),
			TOP_ROLE_LIMIT,
		);
		const roles = await this.prisma.role.findMany({
			where: { id: { in: topGroups.map((group) => group.key) } },
			select: { id: true, name: true },
		});
		const rolesById = new Map(roles.map((role) => [role.id, role.name]));
		return topGroups.map((group) => ({
			key: group.key,
			label: rolesById.get(group.key) ?? group.key,
			count: group.count,
		}));
	}

	private async getPlacementsByCategory(): Promise<readonly CountChartPoint[]> {
		const roleGroups = await this.prisma.placement.groupBy({
			by: ["roleId"],
			_count: { id: true },
		});
		const roles = await this.prisma.role.findMany({
			where: { id: { in: roleGroups.map((group) => group.roleId) } },
			select: { id: true, category: true },
		});
		const categoryByRoleId = new Map(roles.map((role) => [role.id, role.category]));
		const totalsByCategory = new Map<string, number>();
		for (const group of roleGroups) {
			const category = categoryByRoleId.get(group.roleId) ?? "uncategorized";
			totalsByCategory.set(category, (totalsByCategory.get(category) ?? 0) + group._count.id);
		}
		return this.sortCounts(
			Array.from(totalsByCategory.entries()).map(([category, count]) => ({
				key: category,
				label: category,
				count,
			})),
			PLACEMENT_CATEGORY_LIMIT,
		);
	}

	private async getStationPerformance(): Promise<readonly StationPerformancePoint[]> {
		const [placementGroups, complaintGroups] = await Promise.all([
			this.prisma.placement.groupBy({ by: ["stationId"], _count: { id: true } }),
			this.prisma.complaint.groupBy({
				by: ["stationId"],
				where: { stationId: { not: null } },
				_count: { id: true },
			}),
		]);
		const placementCounts = this.sortCounts(
			placementGroups.map((group) => ({ key: group.stationId, count: group._count.id })),
			STATION_PERFORMANCE_LIMIT,
		);
		const complaintCounts = new Map(
			complaintGroups.flatMap((group) => (group.stationId ? [[group.stationId, group._count.id] as const] : [])),
		);
		const stations = await this.prisma.station.findMany({
			where: { id: { in: placementCounts.map((group) => group.key) } },
			select: { id: true, name: true },
		});
		const stationsById = new Map(stations.map((station) => [station.id, station.name]));
		return placementCounts.map((group) => ({
			stationId: group.key,
			stationName: stationsById.get(group.key) ?? group.key,
			placements: group.count,
			complaints: complaintCounts.get(group.key) ?? 0,
		}));
	}

	private async getTierDistribution(): Promise<readonly CountChartPoint[]> {
		const groups = await this.prisma.worker.groupBy({
			by: ["tier"],
			where: SOFT_DELETE_FILTER,
			_count: { id: true },
		});
		return this.sortCounts(
			groups.map((group) => ({ key: group.tier, label: group.tier, count: group._count.id })),
			groups.length,
		);
	}

	private async getGenderSplit(): Promise<readonly CountChartPoint[]> {
		const groups = await this.prisma.worker.groupBy({
			by: ["gender"],
			where: SOFT_DELETE_FILTER,
			_count: { id: true },
		});
		return this.sortCounts(
			groups.map((group) => ({ key: group.gender, label: group.gender, count: group._count.id })),
			groups.length,
		);
	}

	private async getWorkersByWoreda(): Promise<readonly CountChartPoint[]> {
		const groups = await this.prisma.worker.groupBy({
			by: ["area"],
			where: SOFT_DELETE_FILTER,
			_count: { id: true },
		});
		return this.sortCounts(
			groups.map((group) => ({ key: group.area, label: group.area, count: group._count.id })),
			WORKER_LOCATION_LIMIT,
		);
	}

	private sortCounts<T extends { readonly count: number }>(items: readonly T[], limit: number): readonly T[] {
		return Array.from(items)
			.sort((left, right) => right.count - left.count)
			.slice(0, limit);
	}
}
