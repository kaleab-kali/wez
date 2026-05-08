export const STAFF_ROLES = {
	superAdmin: "super_admin",
	opsManager: "ops_manager",
	complianceOfficer: "compliance_officer",
	hrManager: "hr_manager",
	financeManager: "finance_manager",
	itManager: "it_manager",
	trainingManager: "training_manager",
	executiveViewer: "executive_viewer",
	support: "support",
	stationSupervisor: "station_supervisor",
	agent: "agent",
	instructor: "instructor",
} as const;

export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

export const STAFF_ACCESS_ROLES = {
	workerEmployerOperations: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.stationSupervisor,
		STAFF_ROLES.agent,
	],
	workerEmployerCreation: [STAFF_ROLES.superAdmin, STAFF_ROLES.agent],
	demandOperations: [STAFF_ROLES.superAdmin, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	referralCreation: [STAFF_ROLES.superAdmin, STAFF_ROLES.agent],
	placementOperations: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.financeManager,
		STAFF_ROLES.stationSupervisor,
		STAFF_ROLES.agent,
	],
	placementFinalization: [STAFF_ROLES.superAdmin, STAFF_ROLES.agent],
	placementEnding: [STAFF_ROLES.superAdmin, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	hqOverview: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.hrManager,
		STAFF_ROLES.financeManager,
		STAFF_ROLES.itManager,
		STAFF_ROLES.trainingManager,
		STAFF_ROLES.executiveViewer,
	],
	staffUsers: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager, STAFF_ROLES.hrManager],
	platformConfig: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager],
	accessReview: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.hrManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.executiveViewer,
	],
	hiringPolicy: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager, STAFF_ROLES.itManager],
	auditLog: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.hrManager,
		STAFF_ROLES.financeManager,
		STAFF_ROLES.itManager,
		STAFF_ROLES.executiveViewer,
	],
} as const satisfies Record<string, readonly StaffRole[]>;

export const HQ_ADMIN_ROLES = new Set<string>([
	STAFF_ROLES.superAdmin,
	STAFF_ROLES.opsManager,
	STAFF_ROLES.complianceOfficer,
	STAFF_ROLES.hrManager,
	STAFF_ROLES.financeManager,
	STAFF_ROLES.itManager,
	STAFF_ROLES.trainingManager,
	STAFF_ROLES.executiveViewer,
]);

export const isHqAdminRole = (role: string | undefined | null) => !!role && HQ_ADMIN_ROLES.has(role);
export const hasHqAdminRole = (roles: readonly string[] | undefined | null, primaryRole?: string | null) =>
	roles?.some((role) => HQ_ADMIN_ROLES.has(role)) ?? isHqAdminRole(primaryRole);

export const effectiveStaffRoles = (primaryRole?: string | null, roles?: readonly string[] | null) =>
	Array.from(new Set([primaryRole, ...(roles ?? [])].filter((item): item is string => Boolean(item))));

export const hasAnyStaffRole = (userRoles: readonly string[], allowedRoles: readonly StaffRole[] | undefined) =>
	!allowedRoles || allowedRoles.some((allowedRole) => userRoles.includes(allowedRole));

const STAFF_ROUTE_ACCESS: ReadonlyArray<{ prefix: string; roles?: readonly StaffRole[]; exact?: boolean }> = [
	{ prefix: "/staff/dashboard", exact: true },
	{ prefix: "/staff/workers/new", roles: STAFF_ACCESS_ROLES.workerEmployerCreation },
	{ prefix: "/staff/workers", roles: STAFF_ACCESS_ROLES.workerEmployerOperations },
	{ prefix: "/staff/employers/new", roles: STAFF_ACCESS_ROLES.workerEmployerCreation },
	{ prefix: "/staff/employers", roles: STAFF_ACCESS_ROLES.workerEmployerOperations },
	{ prefix: "/staff/jobs", roles: STAFF_ACCESS_ROLES.demandOperations },
	{ prefix: "/staff/hire-requests", roles: STAFF_ACCESS_ROLES.demandOperations },
	{ prefix: "/staff/referrals", roles: STAFF_ACCESS_ROLES.demandOperations },
	{ prefix: "/staff/placements", roles: STAFF_ACCESS_ROLES.placementOperations },
	{ prefix: "/staff-admin", roles: STAFF_ACCESS_ROLES.hqOverview, exact: true },
	{ prefix: "/staff-admin/staff-users", roles: STAFF_ACCESS_ROLES.staffUsers },
	{ prefix: "/staff-admin/access-review", roles: STAFF_ACCESS_ROLES.accessReview },
	{ prefix: "/staff-admin/stations", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/locations", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/role-catalog", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/hiring-policy", roles: STAFF_ACCESS_ROLES.hiringPolicy },
	{ prefix: "/staff-admin/lookups", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/audit-log", roles: STAFF_ACCESS_ROLES.auditLog },
	{ prefix: "/staff-admin/2fa", roles: STAFF_ACCESS_ROLES.hqOverview },
	{ prefix: "/staff-admin/sessions", roles: STAFF_ACCESS_ROLES.hqOverview },
];

export const hasStaffRouteAccess = (
	pathname: string,
	primaryRole?: string | null,
	roles?: readonly string[] | null,
) => {
	const userRoles = effectiveStaffRoles(primaryRole, roles);
	const route = STAFF_ROUTE_ACCESS.find((item) =>
		item.exact ? pathname === item.prefix || pathname === `${item.prefix}/` : pathname.startsWith(item.prefix),
	);
	return route ? hasAnyStaffRole(userRoles, route.roles) : true;
};
