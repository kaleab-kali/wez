import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import type { IEmployersRepository } from "#modules/employers/domain/repositories/employers.repository";
import { EMPLOYERS_REPO } from "#modules/employers/domain/repositories/employers.repository";
import { NotificationOutboxService } from "#modules/notification/application/services/notification-outbox.service";
import type { IWorkersRepository } from "#modules/workers/domain/repositories/workers.repository";
import { WORKERS_REPO } from "#modules/workers/domain/repositories/workers.repository";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { WezSession } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { PrismaService } from "#shared/database/prisma.service";
import type {
	Complaint,
	ComplaintFilter,
	ComplaintPartyType,
	ComplaintResolutionTag,
	ComplaintSeverity,
	ComplaintStatus,
} from "../../domain/entities/complaint.entity";
import { COMPLAINTS_REPO, type IComplaintsRepository } from "../../domain/repositories/complaints.repository";
import type {
	CloseComplaintDto,
	CreateComplaintDto,
	ListComplaintsDto,
	ReferComplaintExternalDto,
} from "../dto/complaint.dto";

const COMPLAINT_GLOBAL_ACCESS_ROLES = ["super_admin", "ops_manager", "compliance_officer"] as const;
const EMPTY_SCOPE_ID = "__none__";
const VALID_RESOLUTION_TAGS = ["partial", "failed"] as const satisfies readonly ComplaintResolutionTag[];
const EMPLOYER_RATING_STEP_DOWN: Record<string, string> = {
	green: "yellow",
	yellow: "orange",
	orange: "red",
	red: "red",
};
const WORKER_HOP_FLAG_ESCALATION: Record<string, string> = {
	none: "notice",
	notice: "warning",
	warning: "suspended",
	suspended: "suspended",
};

type ComplaintPlacement = {
	id: string;
	workerId: string;
	employerId: string;
	stationId: string;
};

type ResolvedComplaintParties = {
	filedByType: ComplaintPartyType;
	filedById: string;
	filedByUserId: string | null;
	againstType: ComplaintPartyType;
	againstId: string;
	workerId: string;
	employerId: string;
};

@Injectable()
export class ComplaintsService {
	constructor(
		@Inject(COMPLAINTS_REPO) private readonly repo: IComplaintsRepository,
		@Inject(WORKERS_REPO) private readonly workers: IWorkersRepository,
		@Inject(EMPLOYERS_REPO) private readonly employers: IEmployersRepository,
		private readonly prisma: PrismaService,
		private readonly auditEvents: AuditEventsService,
		private readonly notifications: NotificationOutboxService,
		private readonly staffAccess: StaffAccessService,
	) {}

	async list(filter: ComplaintFilter) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
	}

	async listForSession(session: WezSession, filter: ListComplaintsDto) {
		if (session.kind === "staff") {
			if (this.staffAccess.hasAnyRole(session, COMPLAINT_GLOBAL_ACCESS_ROLES)) return this.list(filter);
			if (!this.staffAccess.isStationScoped(session)) throw new ForbiddenException({ code: "STATION_SCOPE_REQUIRED" });
			const stationIds = await this.staffAccess.stationIdsForSession(session);
			if (filter.stationId && !stationIds.includes(filter.stationId)) {
				throw new ForbiddenException({ code: "NOT_YOUR_STATION" });
			}
			return this.list({
				...filter,
				stationIds: filter.stationId ? undefined : stationIds.length > 0 ? stationIds : [EMPTY_SCOPE_ID],
			});
		}

		const participant = await this.customerParticipant(session);
		return this.list({
			...filter,
			participantType: participant.type,
			participantId: participant.id,
			stationId: undefined,
		});
	}

	async getByIdForSession(session: WezSession, id: string) {
		const complaint = await this.getById(id);
		await this.assertComplaintAccess(session, complaint);
		return complaint;
	}

	async create(session: WezSession, dto: CreateComplaintDto, auditContext: AuditRequestContext | undefined) {
		this.assertOpposingParties(dto.filedByType, dto.againstType);
		const parties = await this.resolveParties(session, dto);
		const placement = await this.resolvePlacement(parties, dto.placementId);
		const stationId = await this.resolveStationId(session, dto.stationId, placement.stationId);
		if (session.kind === "staff") {
			await this.staffAccess.assertStationAccess(session, stationId, COMPLAINT_GLOBAL_ACCESS_ROLES);
		}
		const status = this.initialStatus(dto.severity);
		const complaint = await this.repo.create({
			filedByType: parties.filedByType,
			filedById: parties.filedById,
			filedByUserId: parties.filedByUserId,
			againstType: parties.againstType,
			againstId: parties.againstId,
			placementId: placement.id,
			stationId,
			takenByAgentId: session.kind === "staff" ? session.user.id : null,
			type: dto.type,
			severity: dto.severity,
			description: dto.description,
			status,
			resolution: null,
			resolutionTag: null,
			externalCaseId: null,
		});
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.complaintCreated,
			targetType: AUDIT_TARGET_TYPES.complaint,
			targetId: complaint.id,
			stationId,
			context: auditContext,
			metadata: this.auditMetadata(complaint),
		});
		await this.notifyComplaintCreated(complaint, placement.stationId);
		return complaint;
	}

	async markMediating(session: WezSession, id: string, auditContext: AuditRequestContext | undefined) {
		const complaint = await this.getById(id);
		await this.assertStaffComplaintAccess(session, complaint);
		if (complaint.status !== "open") throw new ConflictException({ code: "COMPLAINT_NOT_OPEN" });
		const updated = await this.repo.update(id, { status: "mediating" });
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.complaintMediating,
			targetType: AUDIT_TARGET_TYPES.complaint,
			targetId: id,
			stationId: updated.stationId,
			context: auditContext,
			metadata: { ...this.auditMetadata(updated), previousStatus: complaint.status, status: updated.status },
		});
		return updated;
	}

	async referExternal(
		session: WezSession,
		id: string,
		dto: ReferComplaintExternalDto,
		auditContext: AuditRequestContext | undefined,
	) {
		const complaint = await this.getById(id);
		await this.assertStaffComplaintAccess(session, complaint);
		if (complaint.status === "closed") throw new ConflictException({ code: "COMPLAINT_ALREADY_CLOSED" });
		const updated = await this.repo.update(id, {
			status: "referred_external",
			externalCaseId: dto.externalCaseId,
			resolution: dto.resolution ?? complaint.resolution,
		});
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.complaintReferredExternal,
			targetType: AUDIT_TARGET_TYPES.complaint,
			targetId: id,
			stationId: updated.stationId,
			context: auditContext,
			metadata: {
				...this.auditMetadata(updated),
				previousStatus: complaint.status,
				status: updated.status,
				externalCaseId: updated.externalCaseId,
			},
		});
		await this.notifyCompliance(updated);
		return updated;
	}

	async close(session: WezSession, id: string, dto: CloseComplaintDto, auditContext: AuditRequestContext | undefined) {
		const complaint = await this.getById(id);
		await this.assertStaffComplaintAccess(session, complaint);
		if (complaint.status === "closed") throw new ConflictException({ code: "COMPLAINT_ALREADY_CLOSED" });
		const consequenceApplied = this.hasValidComplaintOutcome(dto.resolutionTag);
		await this.prisma.$transaction(async (tx) => {
			await tx.complaint.update({
				where: { id },
				data: {
					status: "closed",
					resolution: dto.resolution,
					resolutionTag: dto.resolutionTag,
					closedAt: new Date(),
					closedById: session.user.id,
				},
			});
			if (consequenceApplied) {
				await this.applyResolutionSideEffect(tx, complaint);
			}
			await this.auditEvents.record(tx, {
				actorId: session.user.id,
				actorRole: session.user.role,
				action: AUDIT_ACTIONS.complaintClosed,
				targetType: AUDIT_TARGET_TYPES.complaint,
				targetId: id,
				stationId: complaint.stationId,
				context: auditContext,
				metadata: {
					...this.auditMetadata(complaint),
					previousStatus: complaint.status,
					status: "closed",
					resolutionTag: dto.resolutionTag,
					consequenceApplied,
					againstType: complaint.againstType,
					againstId: complaint.againstId,
				},
			});
		});
		const updated = await this.getById(id);
		await this.notifyComplaintClosed(updated);
		return updated;
	}

	private async getById(id: string) {
		const complaint = await this.repo.findById(id);
		if (!complaint) throw new NotFoundException({ code: "COMPLAINT_NOT_FOUND" });
		return complaint;
	}

	private async customerParticipant(session: WezSession): Promise<{ type: ComplaintPartyType; id: string }> {
		if (session.user.role === "worker") {
			const worker = await this.workers.findByUserId(session.user.id);
			if (!worker) throw new ForbiddenException({ code: "NO_WORKER_PROFILE" });
			return { type: "worker", id: worker.id };
		}
		if (session.user.role?.startsWith("employer_")) {
			const employer = await this.employers.findByUserId(session.user.id);
			if (!employer) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
			return { type: "employer", id: employer.id };
		}
		throw new ForbiddenException({ code: "COMPLAINTS_NOT_AVAILABLE" });
	}

	private async resolveParties(session: WezSession, dto: CreateComplaintDto): Promise<ResolvedComplaintParties> {
		if (session.kind === "staff") {
			if (!dto.filedById) throw new BadRequestException({ code: "FILED_BY_ID_REQUIRED" });
			await this.assertPartyExists(dto.filedByType, dto.filedById);
			await this.assertPartyExists(dto.againstType, dto.againstId);
			return this.toResolvedParties(dto.filedByType, dto.filedById, null, dto.againstType, dto.againstId);
		}

		const participant = await this.customerParticipant(session);
		if (participant.type !== dto.filedByType) throw new ForbiddenException({ code: "COMPLAINT_FILED_BY_MISMATCH" });
		if (dto.filedById && dto.filedById !== participant.id) {
			throw new ForbiddenException({ code: "COMPLAINT_FILED_BY_MISMATCH" });
		}
		await this.assertPartyExists(dto.againstType, dto.againstId);
		return this.toResolvedParties(dto.filedByType, participant.id, session.user.id, dto.againstType, dto.againstId);
	}

	private toResolvedParties(
		filedByType: ComplaintPartyType,
		filedById: string,
		filedByUserId: string | null,
		againstType: ComplaintPartyType,
		againstId: string,
	): ResolvedComplaintParties {
		const workerId = filedByType === "worker" ? filedById : againstId;
		const employerId = filedByType === "employer" ? filedById : againstId;
		return { filedByType, filedById, filedByUserId, againstType, againstId, workerId, employerId };
	}

	private assertOpposingParties(filedByType: ComplaintPartyType, againstType: ComplaintPartyType) {
		if (filedByType === againstType) throw new BadRequestException({ code: "COMPLAINT_PARTIES_MUST_OPPOSE" });
	}

	private async assertPartyExists(type: ComplaintPartyType, id: string) {
		const exists = type === "worker" ? await this.workers.findById(id) : await this.employers.findById(id);
		if (!exists) throw new NotFoundException({ code: type === "worker" ? "WORKER_NOT_FOUND" : "EMPLOYER_NOT_FOUND" });
	}

	private async resolvePlacement(parties: ResolvedComplaintParties, placementId: string | undefined) {
		const where = placementId
			? { id: placementId, workerId: parties.workerId, employerId: parties.employerId }
			: { workerId: parties.workerId, employerId: parties.employerId };
		const placement = await this.prisma.placement.findFirst({
			where,
			orderBy: { createdAt: "desc" },
			select: { id: true, workerId: true, employerId: true, stationId: true },
		});
		if (!placement) throw new ConflictException({ code: "PLACEMENT_HISTORY_REQUIRED_FOR_COMPLAINT" });
		return placement satisfies ComplaintPlacement;
	}

	private async resolveStationId(session: WezSession, dtoStationId: string | undefined, placementStationId: string) {
		if (session.kind === "staff") {
			if (!dtoStationId) throw new BadRequestException({ code: "STATION_ID_REQUIRED_FOR_COMPLAINT_INTAKE" });
			return dtoStationId;
		}
		if (dtoStationId && dtoStationId !== placementStationId) {
			throw new BadRequestException({ code: "COMPLAINT_STATION_DERIVED_FROM_PLACEMENT" });
		}
		return placementStationId;
	}

	private initialStatus(severity: ComplaintSeverity): ComplaintStatus {
		return severity === "high" ? "referred_external" : "open";
	}

	private async assertComplaintAccess(session: WezSession, complaint: Complaint) {
		if (session.kind === "staff") {
			await this.assertStaffComplaintAccess(session, complaint);
			return;
		}
		const participant = await this.customerParticipant(session);
		const isParticipant =
			(complaint.filedByType === participant.type && complaint.filedById === participant.id) ||
			(complaint.againstType === participant.type && complaint.againstId === participant.id);
		if (!isParticipant) throw new ForbiddenException({ code: "COMPLAINT_NOT_IN_SCOPE" });
	}

	private async assertStaffComplaintAccess(session: WezSession, complaint: Complaint) {
		if (session.kind !== "staff") throw new ForbiddenException({ code: "STAFF_SESSION_REQUIRED" });
		if (this.staffAccess.hasAnyRole(session, COMPLAINT_GLOBAL_ACCESS_ROLES)) return;
		if (!complaint.stationId) throw new ForbiddenException({ code: "COMPLAINT_STATION_REQUIRED" });
		await this.staffAccess.assertStationAccess(session, complaint.stationId, COMPLAINT_GLOBAL_ACCESS_ROLES);
	}

	private hasValidComplaintOutcome(tag: ComplaintResolutionTag): boolean {
		return (VALID_RESOLUTION_TAGS as readonly string[]).includes(tag);
	}

	private async applyResolutionSideEffect(
		tx: Pick<PrismaService, "employer" | "worker">,
		complaint: Complaint,
	): Promise<void> {
		if (complaint.againstType === "employer") {
			const employer = await tx.employer.findUnique({
				where: { id: complaint.againstId },
				select: { rating: true },
			});
			if (employer) {
				await tx.employer.update({
					where: { id: complaint.againstId },
					data: {
						rating: EMPLOYER_RATING_STEP_DOWN[employer.rating] ?? "yellow",
						complaintsCount: { increment: 1 },
					},
				});
			}
			return;
		}

		const worker = await tx.worker.findUnique({ where: { id: complaint.againstId }, select: { hopFlag: true } });
		if (worker) {
			await tx.worker.update({
				where: { id: complaint.againstId },
				data: { hopFlag: WORKER_HOP_FLAG_ESCALATION[worker.hopFlag] ?? "notice" },
			});
		}
	}

	private auditMetadata(complaint: Complaint) {
		return {
			filedByType: complaint.filedByType,
			filedById: complaint.filedById,
			againstType: complaint.againstType,
			againstId: complaint.againstId,
			placementId: complaint.placementId,
			severity: complaint.severity,
			type: complaint.type,
			status: complaint.status,
		};
	}

	private async notifyComplaintCreated(complaint: Complaint, placementStationId: string) {
		if (complaint.status === "referred_external") {
			await this.notifyCompliance(complaint);
		}
		if (complaint.stationId) {
			await this.notifications.enqueueStationAgents({
				stationId: complaint.stationId,
				templateKey: "complaint.created.station",
				payload: { complaintId: complaint.id, severity: complaint.severity, status: complaint.status },
			});
		}
		if (complaint.stationId && placementStationId !== complaint.stationId) {
			await this.notifications.enqueueStationAgents({
				stationId: placementStationId,
				templateKey: "complaint.created.origin_station",
				payload: { complaintId: complaint.id, severity: complaint.severity, status: complaint.status },
			});
		}
	}

	private async notifyCompliance(complaint: Complaint) {
		const officers = await this.prisma.adminUser.findMany({
			where: {
				active: true,
				OR: [
					{ role: "compliance_officer" },
					{ roleAssignments: { some: { role: "compliance_officer", active: true, revokedAt: null } } },
				],
			},
			select: { id: true },
		});
		for (const officer of officers) {
			await this.notifications.enqueueStaff({
				adminUserId: officer.id,
				channel: "in_app",
				templateKey: "complaint.referred_external",
				payload: { complaintId: complaint.id, severity: complaint.severity, status: complaint.status },
			});
		}
	}

	private async notifyComplaintClosed(complaint: Complaint) {
		if (complaint.filedByUserId) {
			await this.notifications.enqueueCustomer({
				userId: complaint.filedByUserId,
				channel: "in_app",
				templateKey: "complaint.closed",
				payload: { complaintId: complaint.id, status: complaint.status, resolutionTag: complaint.resolutionTag ?? "" },
			});
		}
	}
}
