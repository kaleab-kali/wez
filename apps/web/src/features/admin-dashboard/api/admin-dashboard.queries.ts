import { useQuery } from "@tanstack/react-query";

const BASE = "/api/v1/admin/dashboard";

const get = async <T>(url: string): Promise<T> => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

export type AdminDashboardMetrics = {
	money: {
		lifetimeCommissionCents: string;
		activeWagesCents: string;
	};
	counts: {
		totalPlacements: number;
		activePlacements: number;
		workers: number;
		availableWorkers: number;
		flaggedWorkers: number;
		employers: number;
		openComplaints: number;
		openTickets: number;
		stations: number;
		activeStations: number;
	};
};

export const adminDashboardKeys = {
	all: ["admin-dashboard"] as const,
	metrics: () => [...adminDashboardKeys.all, "metrics"] as const,
};

export const useAdminDashboardMetrics = () =>
	useQuery({
		queryKey: adminDashboardKeys.metrics(),
		queryFn: () => get<AdminDashboardMetrics>(`${BASE}/metrics`),
	});
