// Role-aware navigation factory.
// Returns the sidebar/menu items appropriate for a given Wez role.
// Phase 1B: minimal — most domain modules are scaffolded as Phase 1C+ work.

export type NavItem = {
	label: string;
	to: string;
	exact?: boolean;
};

export type WezTenantRole =
	| "worker"
	| "employer_business"
	| "employer_household"
	| "agent"
	| "station_supervisor"
	| "instructor";

const NAV_FOR_ROLE: Record<WezTenantRole, ReadonlyArray<NavItem>> = {
	worker: [
		{ label: "Dashboard", to: "/dashboard", exact: true },
		// { label: "Jobs", to: "/jobs" },           // Phase 1D
		// { label: "Training", to: "/training" },    // Phase 1H
		// { label: "Placements", to: "/my-placements" }, // Phase 1E
	],
	employer_business: [
		{ label: "Dashboard", to: "/dashboard", exact: true },
		// { label: "Browse Workers", to: "/workers" },        // Phase 1C
		// { label: "Hire Requests", to: "/hire-requests" },   // Phase 1D
		// { label: "Job Posts", to: "/jobs" },                // Phase 1D
	],
	employer_household: [
		{ label: "Dashboard", to: "/dashboard", exact: true },
		// { label: "Browse Workers", to: "/workers" },        // Phase 1C
		// { label: "Hire Requests", to: "/hire-requests" },   // Phase 1D
	],
	agent: [
		{ label: "Dashboard", to: "/dashboard", exact: true },
		// { label: "Workers", to: "/agent/workers" },          // Phase 1C
		// { label: "Employers", to: "/agent/employers" },      // Phase 1D
		// { label: "Hire Requests", to: "/agent/hire-requests" }, // Phase 1D
		// { label: "Placements", to: "/agent/placements" },    // Phase 1E
		// { label: "Complaints", to: "/agent/complaints" },    // Phase 1F
	],
	station_supervisor: [
		{ label: "Dashboard", to: "/dashboard", exact: true },
		// Same as agent + escalation queue
	],
	instructor: [
		{ label: "Dashboard", to: "/dashboard", exact: true },
		// { label: "My Batches", to: "/instructor/batches" }, // Phase 1H
	],
};

export const getNavForRole = (role: string | null | undefined): ReadonlyArray<NavItem> => {
	if (!role) return [];
	return NAV_FOR_ROLE[role as WezTenantRole] ?? [];
};
