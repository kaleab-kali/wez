import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import { NotificationOutboxService } from "#modules/notification/application/services/notification-outbox.service";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { WezSession } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { PrismaService } from "#shared/database/prisma.service";
import type {
	Ticket,
	TicketAssignmentOption,
	TicketCategory,
	TicketFilter,
	TicketStatus,
} from "../../domain/entities/ticket.entity";
import { type ITicketsRepository, TICKETS_REPO } from "../../domain/repositories/tickets.repository";
import type { AssignTicketDto, CreateTicketDto, ListTicketsDto, ResolveTicketDto } from "../dto/ticket.dto";

const TICKET_GLOBAL_ACCESS_ROLES = ["super_admin", "ops_manager"] as const;
const TICKET_MANAGER_ROLES = [
	"ops_manager",
	"compliance_officer",
	"finance_manager",
	"it_manager",
	"training_manager",
	"hr_manager",
	"station_supervisor",
	"support",
] as const;
const CATEGORY_OWNER_ROLE: Partial<Record<TicketCategory, string>> = {
	system_issue: "it_manager",
	policy_question: "ops_manager",
	compliance_concern: "compliance_officer",
	finance_issue: "finance_manager",
	training_request: "training_manager",
	hr_issue: "hr_manager",
};
const STAFF_TICKET_NOTIFICATION_CHANNELS = ["in_app", "email"] as const;

@Injectable()
export class TicketsService {
	constructor(
		@Inject(TICKETS_REPO) private readonly repo: ITicketsRepository,
		private readonly prisma: PrismaService,
		private readonly staffAccess: StaffAccessService,
		private readonly auditEvents: AuditEventsService,
		private readonly notifications: NotificationOutboxService,
	) {}

	async list(filter: TicketFilter) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
	}

	async listForSession(session: WezSession, filter: ListTicketsDto) {
		this.assertStaffSession(session);
		if (this.staffAccess.hasAnyRole(session, TICKET_GLOBAL_ACCESS_ROLES)) return this.list(filter);
		const raisedByIds = await this.visibleRaisedByIds(session);
		return this.list({ ...filter, visibleRaisedByIds: raisedByIds, visibleAssignedToIds: [session.user.id] });
	}

	async getByIdForSession(session: WezSession, id: string) {
		const ticket = await this.getById(id);
		await this.assertTicketAccess(session, ticket);
		return ticket;
	}

	async create(session: WezSession, dto: CreateTicketDto, auditContext: AuditRequestContext | undefined) {
		this.assertStaffSession(session);
		const assignedToId = await this.resolveInitialAssignee(session, dto.category);
		const ticket = await this.repo.create({
			raisedById: session.user.id,
			category: dto.category,
			title: dto.title,
			description: dto.description,
			priority: dto.priority,
			status: "open",
			assignedToId,
		});
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.ticketCreated,
			targetType: AUDIT_TARGET_TYPES.ticket,
			targetId: ticket.id,
			context: auditContext,
			metadata: {
				category: ticket.category,
				priority: ticket.priority,
				status: ticket.status,
				assignedToId: ticket.assignedToId,
			},
		});
		await this.notifyTicketAssigned(ticket);
		return ticket;
	}

	async assignmentOptions(session: WezSession): Promise<{ data: TicketAssignmentOption[] }> {
		this.assertStaffSession(session);
		const users = await this.prisma.adminUser.findMany({
			where: {
				active: true,
				OR: [
					{ role: { in: [...TICKET_MANAGER_ROLES] } },
					{ roleAssignments: { some: { role: { in: [...TICKET_MANAGER_ROLES] }, active: true, revokedAt: null } } },
				],
			},
			select: { id: true, name: true, email: true, role: true },
			orderBy: [{ role: "asc" }, { name: "asc" }],
		});
		return { data: users };
	}

	async assign(session: WezSession, id: string, dto: AssignTicketDto, auditContext: AuditRequestContext | undefined) {
		const ticket = await this.getById(id);
		await this.assertTicketAccess(session, ticket);
		if (ticket.status === "closed") throw new ConflictException({ code: "TICKET_ALREADY_CLOSED" });
		if (ticket.status === "resolved") throw new ConflictException({ code: "TICKET_ALREADY_RESOLVED" });
		const assignee = await this.prisma.adminUser.findFirst({
			where: { id: dto.assignedToId, active: true },
			select: { id: true },
		});
		if (!assignee) throw new NotFoundException({ code: "ASSIGNEE_NOT_FOUND" });
		const updated = await this.repo.update(id, { assignedToId: assignee.id, status: this.nextAssignedStatus(ticket) });
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.ticketAssigned,
			targetType: AUDIT_TARGET_TYPES.ticket,
			targetId: id,
			context: auditContext,
			metadata: {
				category: updated.category,
				priority: updated.priority,
				previousAssignedToId: ticket.assignedToId,
				assignedToId: updated.assignedToId,
				previousStatus: ticket.status,
				status: updated.status,
			},
		});
		await this.notifyTicketAssigned(updated);
		return updated;
	}

	async resolve(session: WezSession, id: string, dto: ResolveTicketDto, auditContext: AuditRequestContext | undefined) {
		const ticket = await this.getById(id);
		await this.assertTicketAccess(session, ticket);
		if (ticket.status === "closed") throw new ConflictException({ code: "TICKET_ALREADY_CLOSED" });
		if (ticket.status === "resolved") throw new ConflictException({ code: "TICKET_ALREADY_RESOLVED" });
		const updated = await this.repo.update(id, {
			status: "resolved",
			resolution: dto.resolution,
			resolvedAt: new Date(),
			resolvedById: session.user.id,
		});
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.ticketResolved,
			targetType: AUDIT_TARGET_TYPES.ticket,
			targetId: id,
			context: auditContext,
			metadata: {
				category: updated.category,
				priority: updated.priority,
				previousStatus: ticket.status,
				status: updated.status,
				assignedToId: updated.assignedToId,
				raisedById: updated.raisedById,
			},
		});
		await this.notifyTicketResolved(updated);
		return updated;
	}

	async close(session: WezSession, id: string, auditContext: AuditRequestContext | undefined) {
		const ticket = await this.getById(id);
		await this.assertTicketCloseAccess(session, ticket);
		if (ticket.status === "closed") throw new ConflictException({ code: "TICKET_ALREADY_CLOSED" });
		if (ticket.status !== "resolved") throw new ConflictException({ code: "TICKET_NOT_RESOLVED" });
		const updated = await this.repo.update(id, { status: "closed" });
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.ticketClosed,
			targetType: AUDIT_TARGET_TYPES.ticket,
			targetId: id,
			context: auditContext,
			metadata: {
				category: updated.category,
				priority: updated.priority,
				previousStatus: ticket.status,
				status: updated.status,
				assignedToId: updated.assignedToId,
				raisedById: updated.raisedById,
			},
		});
		await this.notifyTicketClosed(updated, session.user.id);
		return updated;
	}

	private async getById(id: string) {
		const ticket = await this.repo.findById(id);
		if (!ticket) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
		return ticket;
	}

	private assertStaffSession(session: WezSession) {
		if (session.kind !== "staff") throw new ForbiddenException({ code: "STAFF_SESSION_REQUIRED" });
	}

	private async assertTicketAccess(session: WezSession, ticket: Ticket) {
		this.assertStaffSession(session);
		if (this.staffAccess.hasAnyRole(session, TICKET_GLOBAL_ACCESS_ROLES)) return;
		if (ticket.raisedById === session.user.id || ticket.assignedToId === session.user.id) return;
		if (this.staffAccess.hasAnyRole(session, ["station_supervisor"])) {
			const visibleRaisedByIds = await this.visibleRaisedByIds(session);
			if (visibleRaisedByIds.includes(ticket.raisedById)) return;
		}
		throw new ForbiddenException({ code: "TICKET_NOT_IN_SCOPE" });
	}

	private async assertTicketCloseAccess(session: WezSession, ticket: Ticket) {
		this.assertStaffSession(session);
		if (this.staffAccess.hasAnyRole(session, TICKET_GLOBAL_ACCESS_ROLES)) return;
		if (ticket.raisedById === session.user.id) return;
		if (this.staffAccess.hasAnyRole(session, ["station_supervisor"])) {
			const visibleRaisedByIds = await this.visibleRaisedByIds(session);
			if (visibleRaisedByIds.includes(ticket.raisedById)) return;
		}
		throw new ForbiddenException({ code: "TICKET_CLOSE_NOT_ALLOWED" });
	}

	private async visibleRaisedByIds(session: WezSession): Promise<string[]> {
		const ids = [session.user.id];
		if (this.staffAccess.hasAnyRole(session, ["station_supervisor"])) {
			ids.push(...(await this.staffAccess.agentIdsForSession(session)));
		}
		return Array.from(new Set(ids));
	}

	private async resolveInitialAssignee(session: WezSession, category: TicketCategory): Promise<string | null> {
		if (category === "other") {
			const supervisorId = await this.stationSupervisorForSession(session);
			if (supervisorId) return supervisorId;
		}
		const ownerRole = CATEGORY_OWNER_ROLE[category] ?? "ops_manager";
		const owner = await this.findActiveStaffByRole(ownerRole);
		return owner?.id ?? null;
	}

	private async stationSupervisorForSession(session: WezSession): Promise<string | null> {
		const stationIds = await this.staffAccess.stationIdsForSession(session);
		if (stationIds.length === 0) return null;
		const station = await this.prisma.station.findFirst({
			where: { id: { in: stationIds }, supervisorUserId: { not: null } },
			select: { supervisorUserId: true },
		});
		return station?.supervisorUserId ?? null;
	}

	private async findActiveStaffByRole(role: string): Promise<{ id: string } | null> {
		return this.prisma.adminUser.findFirst({
			where: {
				active: true,
				OR: [{ role }, { roleAssignments: { some: { role, active: true, revokedAt: null } } }],
			},
			select: { id: true },
			orderBy: { createdAt: "asc" },
		});
	}

	private nextAssignedStatus(ticket: Ticket): TicketStatus {
		return ticket.status === "open" ? "in_progress" : "escalated_higher";
	}

	private async notifyTicketAssigned(ticket: Ticket) {
		if (!ticket.assignedToId) return;
		await this.createStaffNotification(ticket.assignedToId, "ticket.assigned", {
			ticketId: ticket.id,
			category: ticket.category,
			priority: ticket.priority,
		});
	}

	private async notifyTicketResolved(ticket: Ticket) {
		await this.createStaffNotification(ticket.raisedById, "ticket.resolved", {
			ticketId: ticket.id,
			category: ticket.category,
			status: ticket.status,
		});
	}

	private async notifyTicketClosed(ticket: Ticket, closedById: string) {
		if (!ticket.assignedToId || ticket.assignedToId === closedById) return;
		await this.createStaffNotification(ticket.assignedToId, "ticket.closed", {
			ticketId: ticket.id,
			category: ticket.category,
			status: ticket.status,
		});
	}

	private async createStaffNotification(adminUserId: string, templateKey: string, payload: Record<string, string>) {
		await this.notifications.enqueueStaffChannels({
			adminUserId,
			channels: STAFF_TICKET_NOTIFICATION_CHANNELS,
			templateKey,
			payload,
		});
	}
}
