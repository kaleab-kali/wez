export const AUDIT_ACTIONS = {
	jobCreated: "job.created",
	jobUpdated: "job.updated",
	jobClosed: "job.closed",
	workerProfileUpdated: "worker.profile_updated",
	staffUserCreated: "staff_user.created",
	staffUserUpdated: "staff_user.updated",
	staffRoleAssigned: "staff_role.assigned",
	staffRoleRevoked: "staff_role.revoked",
	locationCreated: "location.created",
	locationUpdated: "location.updated",
	locationDeactivated: "location.deactivated",
	stationCreated: "station.created",
	stationUpdated: "station.updated",
	stationAgentAssigned: "station.agent_assigned",
	stationAgentUnassigned: "station.agent_unassigned",
	placementFinalized: "placement.finalized",
	placementEnded: "placement.ended",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_TARGET_TYPES = {
	job: "job",
	worker: "worker",
	placement: "placement",
	staffUser: "staff_user",
	staffRoleAssignment: "staff_role_assignment",
	location: "location",
	station: "station",
	agentAssignment: "agent_assignment",
} as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[keyof typeof AUDIT_TARGET_TYPES];
