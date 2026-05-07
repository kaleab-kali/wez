export const AUDIT_ACTIONS = {
	jobCreated: "job.created",
	jobUpdated: "job.updated",
	jobClosed: "job.closed",
	workerProfileUpdated: "worker.profile_updated",
	placementFinalized: "placement.finalized",
	placementEnded: "placement.ended",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_TARGET_TYPES = {
	job: "job",
	worker: "worker",
	placement: "placement",
} as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[keyof typeof AUDIT_TARGET_TYPES];
