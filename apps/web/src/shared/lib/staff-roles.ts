export const STAFF_ROLES = {
	superAdmin: "super_admin",
	opsManager: "ops_manager",
	complianceOfficer: "compliance_officer",
	hrManager: "hr_manager",
	financeManager: "finance_manager",
	itManager: "it_manager",
	trainingManager: "training_manager",
	stationSupervisor: "station_supervisor",
	agent: "agent",
	instructor: "instructor",
} as const;

export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

export const HQ_ADMIN_ROLES = new Set<string>([
	STAFF_ROLES.superAdmin,
	STAFF_ROLES.opsManager,
	STAFF_ROLES.complianceOfficer,
	STAFF_ROLES.hrManager,
	STAFF_ROLES.financeManager,
	STAFF_ROLES.itManager,
	STAFF_ROLES.trainingManager,
]);

export const isHqAdminRole = (role: string | undefined | null) => !!role && HQ_ADMIN_ROLES.has(role);
