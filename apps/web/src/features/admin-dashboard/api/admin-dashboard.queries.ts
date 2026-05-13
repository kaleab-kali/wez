import { useQuery } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

const BASE = "/admin/dashboard";

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

export const adminDashboardKeys = {
	all: ["admin-dashboard"] as const,
	metrics: () => [...adminDashboardKeys.all, "metrics"] as const,
};

export const useAdminDashboardMetrics = () =>
	useQuery({
		queryKey: adminDashboardKeys.metrics(),
		queryFn: () => api.get<AdminDashboardMetrics>(`${BASE}/metrics`),
	});
