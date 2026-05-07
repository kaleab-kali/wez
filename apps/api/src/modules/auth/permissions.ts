// ============================================================
// WEZ PERMISSIONS — single-tenant role-based access control
// ============================================================
// Two populations:
//   - CUSTOMERS: tenant Better Auth (workers + employers). Self-signup possible.
//   - STAFF: admin Better Auth (Wez employees). HQ-provisioned only.
// Source of truth for backend permission checks + frontend UI gating.
// See docs/PERMISSIONS_GUIDE.md for the matrix.
// ============================================================

export const WEZ_CUSTOMER_ROLES = ["worker", "employer_business", "employer_household"] as const;

export const WEZ_STAFF_ROLES = [
	// HQ tier
	"super_admin",
	"ops_manager",
	"compliance_officer",
	"hr_manager",
	"finance_manager",
	"it_manager",
	"training_manager",
	"support",
	// Operations tier
	"agent",
	"station_supervisor",
	"instructor",
] as const;

export type WezCustomerRole = (typeof WEZ_CUSTOMER_ROLES)[number];
export type WezStaffRole = (typeof WEZ_STAFF_ROLES)[number];
export type WezRole = WezCustomerRole | WezStaffRole;

// Permission strings: <resource>:<action>
export const PERMISSIONS = {
	worker: ["read", "create", "update", "suspend", "list"],
	employer: ["read", "create", "update", "ban", "list"],
	job: ["read", "create", "update", "close", "list"],
	hire_request: ["read", "create", "cancel", "list"],
	referral: ["read", "create", "respond", "list"],
	placement: ["read", "finalize", "end", "list"],
	complaint: ["read", "create", "mediate", "close", "refer_external", "list"],
	ticket: ["read", "create", "assign", "resolve", "list"],
	station: ["read", "create", "update", "list"],
	role_catalog: ["read", "update"],
	commission_config: ["read", "update"],
	course: ["read", "create", "update", "list"],
	enrollment: ["read", "create", "update", "list"],
	notification: ["read", "send"],
	audit: ["read", "export"],
	report: ["read", "export", "file"],
	dashboard: ["read"],
	flag: ["read", "set", "lift"],
	user: ["read", "create", "update", "deactivate", "list"],
	api_key: ["read", "create", "revoke"],
	platform_settings: ["read", "update"],
	lookup: ["read", "create", "update"],
} as const;

export type Resource = keyof typeof PERMISSIONS;
export type Permission = `${Resource}:${string}`;

// Customer roles — can self-signup or be agent-led. Limited to their own data + reading the catalog.
const customerPermissions: Record<WezCustomerRole, ReadonlyArray<Permission>> = {
	worker: [
		"worker:read",
		"worker:update",
		"hire_request:read",
		"hire_request:list",
		"placement:read",
		"course:read",
		"course:list",
		"enrollment:create",
		"enrollment:read",
		"complaint:create",
		"complaint:read",
		"notification:read",
	],
	employer_business: [
		"worker:read",
		"worker:list",
		"employer:read",
		"job:create",
		"job:update",
		"job:close",
		"job:read",
		"job:list",
		"hire_request:create",
		"hire_request:read",
		"hire_request:cancel",
		"hire_request:list",
		"referral:read",
		"referral:respond",
		"placement:read",
		"placement:list",
		"complaint:create",
		"complaint:read",
		"notification:read",
	],
	employer_household: [
		"worker:read",
		"worker:list",
		"employer:read",
		"job:create",
		"job:update",
		"job:close",
		"job:read",
		"job:list",
		"hire_request:create",
		"hire_request:read",
		"hire_request:cancel",
		"hire_request:list",
		"referral:read",
		"referral:respond",
		"placement:read",
		"placement:list",
		"complaint:create",
		"complaint:read",
		"notification:read",
	],
};

// Staff roles — Wez employees, all admin-provisioned, all on admin Better Auth instance.
const staffPermissions: Record<WezStaffRole, ReadonlyArray<Permission>> = {
	super_admin: Object.entries(PERMISSIONS).flatMap(([res, acts]) => acts.map((a) => `${res}:${a}` as Permission)),
	ops_manager: [
		"station:read",
		"station:create",
		"station:update",
		"station:list",
		"user:read",
		"user:create",
		"user:update",
		"user:list",
		"worker:read",
		"worker:list",
		"worker:suspend",
		"employer:read",
		"employer:list",
		"employer:ban",
		"placement:read",
		"placement:list",
		"complaint:read",
		"complaint:list",
		"complaint:close",
		"ticket:read",
		"ticket:list",
		"ticket:assign",
		"ticket:resolve",
		"audit:read",
		"dashboard:read",
		"report:read",
		"report:export",
		"flag:read",
		"flag:set",
		"flag:lift",
		"role_catalog:read",
		"role_catalog:update",
		"platform_settings:read",
		"platform_settings:update",
		"lookup:read",
		"lookup:create",
		"lookup:update",
	],
	compliance_officer: [
		"complaint:read",
		"complaint:list",
		"complaint:mediate",
		"complaint:close",
		"complaint:refer_external",
		"audit:read",
		"audit:export",
		"dashboard:read",
		"worker:read",
		"employer:read",
		"placement:read",
		"report:read",
		"report:export",
	],
	hr_manager: [
		"user:read",
		"user:create",
		"user:update",
		"user:list",
		"user:deactivate",
		"audit:read",
		"dashboard:read",
	],
	finance_manager: [
		"placement:read",
		"placement:list",
		"report:read",
		"report:export",
		"report:file",
		"audit:read",
		"dashboard:read",
	],
	it_manager: [
		"api_key:read",
		"api_key:create",
		"api_key:revoke",
		"platform_settings:read",
		"platform_settings:update",
		"ticket:read",
		"ticket:assign",
		"ticket:resolve",
		"audit:read",
		"dashboard:read",
	],
	training_manager: [
		"course:read",
		"course:create",
		"course:update",
		"course:list",
		"enrollment:read",
		"enrollment:list",
		"enrollment:update",
		"user:read",
		"dashboard:read",
	],
	support: ["worker:read", "employer:read", "placement:read", "complaint:read", "ticket:read", "ticket:create"],
	// Operations tier — desk staff
	agent: [
		"worker:read",
		"worker:create",
		"worker:update",
		"worker:list",
		"employer:read",
		"employer:create",
		"employer:update",
		"employer:list",
		"job:read",
		"job:create",
		"job:update",
		"job:close",
		"job:list",
		"hire_request:read",
		"hire_request:create",
		"hire_request:cancel",
		"hire_request:list",
		"referral:read",
		"referral:create",
		"referral:list",
		"placement:read",
		"placement:finalize",
		"placement:end",
		"placement:list",
		"complaint:read",
		"complaint:create",
		"complaint:mediate",
		"complaint:close",
		"complaint:list",
		"ticket:create",
		"ticket:read",
		"course:read",
		"course:list",
		"enrollment:create",
		"enrollment:read",
		"notification:read",
		"station:read",
		"role_catalog:read",
		"lookup:read",
	],
	station_supervisor: [
		"worker:read",
		"worker:list",
		"worker:update",
		"worker:suspend",
		"employer:read",
		"employer:list",
		"employer:update",
		"employer:ban",
		"job:read",
		"job:list",
		"hire_request:read",
		"hire_request:list",
		"referral:list",
		"placement:read",
		"placement:list",
		"placement:end",
		"complaint:read",
		"complaint:list",
		"complaint:close",
		"complaint:refer_external",
		"ticket:read",
		"ticket:list",
		"ticket:assign",
		"ticket:resolve",
		"audit:read",
		"report:read",
		"report:export",
		"flag:read",
		"flag:set",
		"flag:lift",
		"station:read",
		"station:update",
		"user:read",
		"user:list",
		"role_catalog:read",
		"lookup:read",
	],
	instructor: [
		"course:read",
		"course:list",
		"enrollment:read",
		"enrollment:list",
		"enrollment:update",
		"notification:read",
	],
};

const allPermissions: Record<WezRole, ReadonlyArray<Permission>> = {
	...customerPermissions,
	...staffPermissions,
};

export const hasPermission = (role: WezRole | string | null | undefined, permission: Permission): boolean => {
	if (!role) return false;
	const perms = allPermissions[role as WezRole];
	return perms ? perms.includes(permission) : false;
};

export const permissionsForRole = (role: WezRole | string): ReadonlyArray<Permission> => {
	return allPermissions[role as WezRole] ?? [];
};

export const isStaffRole = (role: string | null | undefined): boolean =>
	!!role && (WEZ_STAFF_ROLES as readonly string[]).includes(role);

export const isCustomerRole = (role: string | null | undefined): boolean =>
	!!role && (WEZ_CUSTOMER_ROLES as readonly string[]).includes(role);

// Backward-compatible aliases (for any imports still using the old names).
export type WezTenantRole = WezCustomerRole;
export type WezAdminRole = WezStaffRole;
export const WEZ_TENANT_ROLES = WEZ_CUSTOMER_ROLES;
export const WEZ_ADMIN_ROLES = WEZ_STAFF_ROLES;
