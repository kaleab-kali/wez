// Customer app navigation. Wez staff use the admin Better Auth instance and
// the /staff route tree, not tenant roles.

export type NavItem = {
	label: string;
	to: string;
	exact?: boolean;
};

export type WezTenantRole = "worker" | "employer_business" | "employer_household";

const NAV_FOR_ROLE: Record<WezTenantRole, ReadonlyArray<NavItem>> = {
	worker: [
		{ label: "Dashboard", to: "/app/dashboard", exact: true },
		// { label: "Jobs", to: "/app/jobs" },
		// { label: "Training", to: "/app/training" },
	],
	employer_business: [
		{ label: "Dashboard", to: "/app/dashboard", exact: true },
		// { label: "Workers", to: "/app/workers" },
		// { label: "Hire Requests", to: "/app/hire-requests" },
		// { label: "Job Posts", to: "/app/jobs" },
	],
	employer_household: [
		{ label: "Dashboard", to: "/app/dashboard", exact: true },
		// { label: "Workers", to: "/app/workers" },
	],
};

export const getNavForRole = (role: string | null | undefined): ReadonlyArray<NavItem> => {
	if (!role) return [];
	return NAV_FOR_ROLE[role as WezTenantRole] ?? [];
};
