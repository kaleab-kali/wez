import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/admin/staff-users";
const ACCESS_REVIEW_BASE = "/api/v1/admin/access-review";
const ORG_CHART_BASE = "/api/v1/admin/staff-org-chart";

const get = async <T>(url: string): Promise<T> => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

const send = async <T>(url: string, method: string, body?: unknown): Promise<T> => {
	const res = await fetch(url, {
		method,
		credentials: "include",
		headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const errBody = await res.json().catch(() => ({}));
		throw new Error(errBody?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

export const STAFF_ROLES = [
	"super_admin",
	"ops_manager",
	"compliance_officer",
	"hr_manager",
	"finance_manager",
	"it_manager",
	"training_manager",
	"support",
	"executive_viewer",
	"agent",
	"station_supervisor",
	"instructor",
] as const;

export const SCOPE_TYPES = ["global", "admin_area", "sub_area", "locality", "station"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type ScopeType = (typeof SCOPE_TYPES)[number];

export type StaffRoleAssignment = {
	id: string;
	role: StaffRole;
	scopeType: ScopeType;
	scopeId: string | null;
	active: boolean;
	assignedAt: string;
	revokedAt: string | null;
};

export type StaffUser = {
	id: string;
	name: string;
	email: string;
	role: StaffRole;
	active: boolean;
	twoFactorEnabled: boolean;
	createdAt: string;
	updatedAt: string;
	roleAssignments: StaffRoleAssignment[];
	agentAssignments: Array<{ id: string; stationId: string; assignedAt: string; station: { name: string } }>;
};

export type StaffAccessReviewRow = {
	id: string;
	name: string;
	email: string;
	role: string;
	scopeType: ScopeType | string;
	scopeId: string | null;
	scopeLabel: string | null;
	active: boolean;
};

export type StaffOrgChartUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	active: boolean;
};

export type StaffOrgChartStation = {
	id: string;
	name: string;
	supervisor: StaffOrgChartUser | null;
	agents: StaffOrgChartUser[];
};

export type StaffOrgChart = {
	executives: StaffOrgChartUser[];
	functionalManagers: Array<{ role: string; users: StaffOrgChartUser[] }>;
	stations: StaffOrgChartStation[];
	unassignedAgents: StaffOrgChartUser[];
};

export const staffUserKeys = {
	all: ["staff-users"] as const,
	list: () => [...staffUserKeys.all, "list"] as const,
	accessReview: () => [...staffUserKeys.all, "access-review"] as const,
	orgChart: () => [...staffUserKeys.all, "org-chart"] as const,
};

export const useStaffUsers = () =>
	useQuery({
		queryKey: staffUserKeys.list(),
		queryFn: () => get<{ data: StaffUser[] }>(BASE).then((b) => b.data),
	});

export const useStaffAccessReview = () =>
	useQuery({
		queryKey: staffUserKeys.accessReview(),
		queryFn: () => get<{ data: StaffAccessReviewRow[] }>(ACCESS_REVIEW_BASE).then((b) => b.data),
	});

export const useStaffOrgChart = () =>
	useQuery({
		queryKey: staffUserKeys.orgChart(),
		queryFn: () => get<{ data: StaffOrgChart }>(ORG_CHART_BASE).then((b) => b.data),
	});

export const useCreateStaffUser = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { name: string; email: string; primaryRole: StaffRole; temporaryPassword?: string }) =>
			send<{ data: { user: StaffUser; temporaryPassword: string } }>(BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: staffUserKeys.list() }),
	});
};

export const useAssignStaffRole = (staffUserId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { role: StaffRole; scopeType: ScopeType; scopeId?: string }) =>
			send<{ data: StaffRoleAssignment }>(`${BASE}/${staffUserId}/role-assignments`, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: staffUserKeys.list() }),
	});
};

export const useRevokeStaffRole = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { assignmentId: string; reason?: string }) =>
			send<{ data: StaffRoleAssignment }>(`${BASE}/role-assignments/${input.assignmentId}/revoke`, "POST", {
				reason: input.reason,
			}).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: staffUserKeys.list() }),
	});
};
