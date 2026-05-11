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

export const ALL_STAFF_ROLES = [
	STAFF_ROLES.superAdmin,
	STAFF_ROLES.opsManager,
	STAFF_ROLES.complianceOfficer,
	STAFF_ROLES.hrManager,
	STAFF_ROLES.financeManager,
	STAFF_ROLES.itManager,
	STAFF_ROLES.trainingManager,
	STAFF_ROLES.support,
	STAFF_ROLES.executiveViewer,
	STAFF_ROLES.agent,
	STAFF_ROLES.stationSupervisor,
	STAFF_ROLES.instructor,
] as const satisfies readonly StaffRole[];

const HR_MANAGED_STAFF_ROLES = [
	STAFF_ROLES.agent,
	STAFF_ROLES.stationSupervisor,
	STAFF_ROLES.instructor,
	STAFF_ROLES.support,
] as const satisfies readonly StaffRole[];

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
	jobCreation: [STAFF_ROLES.superAdmin, STAFF_ROLES.agent],
	placementOperations: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.financeManager,
		STAFF_ROLES.stationSupervisor,
		STAFF_ROLES.agent,
	],
	placementFinalization: [STAFF_ROLES.superAdmin, STAFF_ROLES.agent],
	placementEnding: [STAFF_ROLES.superAdmin, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	complaintOperations: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.stationSupervisor,
		STAFF_ROLES.agent,
	],
	complaintIntake: [STAFF_ROLES.superAdmin, STAFF_ROLES.agent],
	complaintMediation: [STAFF_ROLES.superAdmin, STAFF_ROLES.complianceOfficer, STAFF_ROLES.agent],
	complaintClosure: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.stationSupervisor,
		STAFF_ROLES.agent,
	],
	complaintExternalReferral: [STAFF_ROLES.superAdmin, STAFF_ROLES.complianceOfficer, STAFF_ROLES.stationSupervisor],
	complaintReferralLetter: [STAFF_ROLES.superAdmin, STAFF_ROLES.complianceOfficer],
	ticketOperations: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.hrManager,
		STAFF_ROLES.financeManager,
		STAFF_ROLES.itManager,
		STAFF_ROLES.trainingManager,
		STAFF_ROLES.support,
		STAFF_ROLES.stationSupervisor,
		STAFF_ROLES.agent,
		STAFF_ROLES.instructor,
	],
	ticketAssignment: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.itManager,
		STAFF_ROLES.stationSupervisor,
	],
	ticketResolution: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.hrManager,
		STAFF_ROLES.financeManager,
		STAFF_ROLES.itManager,
		STAFF_ROLES.trainingManager,
		STAFF_ROLES.support,
		STAFF_ROLES.stationSupervisor,
	],
	hqOverview: [
		STAFF_ROLES.superAdmin,
		STAFF_ROLES.opsManager,
		STAFF_ROLES.complianceOfficer,
		STAFF_ROLES.hrManager,
		STAFF_ROLES.financeManager,
		STAFF_ROLES.itManager,
		STAFF_ROLES.executiveViewer,
	],
	accountSecurity: [
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

export const manageableStaffRoles = (userRoles: readonly string[]): readonly StaffRole[] => {
	if (userRoles.includes(STAFF_ROLES.superAdmin)) return ALL_STAFF_ROLES;
	if (userRoles.includes(STAFF_ROLES.opsManager)) {
		return ALL_STAFF_ROLES.filter((role) => role !== STAFF_ROLES.superAdmin);
	}
	if (userRoles.includes(STAFF_ROLES.hrManager)) return HR_MANAGED_STAFF_ROLES;
	return [];
};

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
	{ prefix: "/staff/complaints", roles: STAFF_ACCESS_ROLES.complaintOperations },
	{ prefix: "/staff/tickets", roles: STAFF_ACCESS_ROLES.ticketOperations },
	{ prefix: "/staff-admin", roles: STAFF_ACCESS_ROLES.hqOverview, exact: true },
	{ prefix: "/staff-admin/staff-users", roles: STAFF_ACCESS_ROLES.staffUsers },
	{ prefix: "/staff-admin/access-review", roles: STAFF_ACCESS_ROLES.accessReview },
	{ prefix: "/staff-admin/stations", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/locations", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/role-catalog", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/hiring-policy", roles: STAFF_ACCESS_ROLES.hiringPolicy },
	{ prefix: "/staff-admin/lookups", roles: STAFF_ACCESS_ROLES.platformConfig },
	{ prefix: "/staff-admin/audit-log", roles: STAFF_ACCESS_ROLES.auditLog },
	{ prefix: "/staff-admin/2fa", roles: STAFF_ACCESS_ROLES.accountSecurity },
	{ prefix: "/staff-admin/sessions", roles: STAFF_ACCESS_ROLES.accountSecurity },
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
	return route ? hasAnyStaffRole(userRoles, route.roles) : false;
};
