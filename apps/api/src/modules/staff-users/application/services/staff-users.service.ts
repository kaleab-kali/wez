import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import { isStaffRole, type WezAdminRole } from "#modules/auth/permissions";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import { PrismaService } from "#shared/database/prisma.service";
import type { AssignStaffRoleDto, CreateStaffUserDto, UpdateStaffUserDto } from "../dto/staff-user.dto";

const HR_MANAGED_ROLES: readonly WezAdminRole[] = ["agent", "station_supervisor", "instructor", "support"];
const OPS_BLOCKED_ROLES: readonly WezAdminRole[] = ["super_admin"];
const ACCESS_SCOPE_TYPES = {
	global: "global",
	station: "station",
} as const;
const STAFF_REVIEW_ROLES = {
	agent: "agent",
	stationSupervisor: "station_supervisor",
} as const;
const SCOPED_PRIMARY_ROLES = [STAFF_REVIEW_ROLES.agent, STAFF_REVIEW_ROLES.stationSupervisor] as const;
const MISSING_SCOPE_KEY = "missing";

export type StaffAccessReviewRow = {
	readonly id: string;
	readonly name: string;
	readonly email: string;
	readonly role: string;
	readonly scopeType: string;
	readonly scopeId: string | null;
	readonly scopeLabel: string | null;
	readonly active: boolean;
};

export type StaffOrgChartUser = {
	readonly id: string;
	readonly name: string;
	readonly email: string;
	readonly role: string;
	readonly active: boolean;
};

export type StaffOrgChartStation = {
	readonly id: string;
	readonly name: string;
	readonly supervisor: StaffOrgChartUser | null;
	readonly agents: readonly StaffOrgChartUser[];
};

export type StaffOrgChart = {
	readonly executives: readonly StaffOrgChartUser[];
	readonly functionalManagers: readonly { readonly role: string; readonly users: readonly StaffOrgChartUser[] }[];
	readonly stations: readonly StaffOrgChartStation[];
	readonly unassignedAgents: readonly StaffOrgChartUser[];
};

@Injectable()
export class StaffUsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly auditEvents: AuditEventsService,
	) {}

	async list() {
		return this.prisma.adminUser.findMany({
			orderBy: [{ active: "desc" }, { name: "asc" }],
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				active: true,
				twoFactorEnabled: true,
				createdAt: true,
				updatedAt: true,
				roleAssignments: {
					where: { active: true, revokedAt: null },
					orderBy: { assignedAt: "desc" },
				},
				agentAssignments: {
					where: { active: true },
					select: { id: true, stationId: true, assignedAt: true, station: { select: { name: true } } },
				},
			},
		});
	}

	async listAccessReview(): Promise<StaffAccessReviewRow[]> {
		const [users, stations, locations] = await Promise.all([
			this.list(),
			this.prisma.station.findMany({
				select: { id: true, name: true, supervisorUserId: true, active: true },
				orderBy: { name: "asc" },
			}),
			this.prisma.location.findMany({
				select: { id: true, nameEn: true },
			}),
		]);
		const stationById = new Map(stations.map((station) => [station.id, station.name]));
		const locationById = new Map(locations.map((location) => [location.id, location.nameEn]));
		return users.flatMap((user) => {
			const roleRows = user.roleAssignments.map((assignment) => ({
				id: assignment.id,
				name: user.name,
				email: user.email,
				role: assignment.role,
				scopeType: assignment.scopeType,
				scopeId: assignment.scopeId,
				scopeLabel: this.scopeLabel(assignment.scopeType, assignment.scopeId, stationById, locationById),
				active: user.active && assignment.active,
			}));
			const agentRows = user.agentAssignments.map((assignment) => ({
				id: assignment.id,
				name: user.name,
				email: user.email,
				role: STAFF_REVIEW_ROLES.agent,
				scopeType: ACCESS_SCOPE_TYPES.station,
				scopeId: assignment.stationId,
				scopeLabel: stationById.get(assignment.stationId) ?? assignment.station.name,
				active: user.active,
			}));
			const supervisedStationRows = stations
				.filter((station) => station.supervisorUserId === user.id)
				.map((station) => ({
					id: `${user.id}:${station.id}:${STAFF_REVIEW_ROLES.stationSupervisor}`,
					name: user.name,
					email: user.email,
					role: STAFF_REVIEW_ROLES.stationSupervisor,
					scopeType: ACCESS_SCOPE_TYPES.station,
					scopeId: station.id,
					scopeLabel: station.name,
					active: user.active && station.active,
				}));
			const scopedPrimaryRows = SCOPED_PRIMARY_ROLES.includes(user.role as (typeof SCOPED_PRIMARY_ROLES)[number])
				? []
				: [
						{
							id: `${user.id}:primary:${user.role}`,
							name: user.name,
							email: user.email,
							role: user.role,
							scopeType: ACCESS_SCOPE_TYPES.global,
							scopeId: null,
							scopeLabel: null,
							active: user.active,
						},
					];
			const missingScopedPrimaryRows =
				SCOPED_PRIMARY_ROLES.includes(user.role as (typeof SCOPED_PRIMARY_ROLES)[number]) &&
				agentRows.length === 0 &&
				supervisedStationRows.length === 0
					? [
							{
								id: `${user.id}:primary:${user.role}:missing-scope`,
								name: user.name,
								email: user.email,
								role: user.role,
								scopeType: ACCESS_SCOPE_TYPES.station,
								scopeId: null,
								scopeLabel: null,
								active: false,
							},
						]
					: [];
			return this.uniqueAccessRows([
				...scopedPrimaryRows,
				...missingScopedPrimaryRows,
				...roleRows,
				...agentRows,
				...supervisedStationRows,
			]);
		});
	}

	async orgChart(): Promise<StaffOrgChart> {
		const [users, stations] = await Promise.all([
			this.prisma.adminUser.findMany({
				where: { active: true },
				select: { id: true, name: true, email: true, role: true, active: true },
				orderBy: [{ role: "asc" }, { name: "asc" }],
			}),
			this.prisma.station.findMany({
				where: { active: true },
				select: {
					id: true,
					name: true,
					supervisor: { select: { id: true, name: true, email: true, role: true, active: true } },
					agentAssignments: {
						where: { active: true, removedAt: null, user: { active: true } },
						select: { user: { select: { id: true, name: true, email: true, role: true, active: true } } },
						orderBy: { assignedAt: "asc" },
					},
				},
				orderBy: { name: "asc" },
			}),
		]);
		const usersByRole = new Map<string, StaffOrgChartUser[]>();
		for (const user of users) {
			usersByRole.set(user.role, [...(usersByRole.get(user.role) ?? []), user]);
		}
		const assignedAgentIds = new Set<string>();
		const stationRows = stations.map((station) => {
			const agents = station.agentAssignments.map((assignment) => assignment.user);
			for (const agent of agents) assignedAgentIds.add(agent.id);
			return {
				id: station.id,
				name: station.name,
				supervisor: station.supervisor,
				agents,
			};
		});
		const unassignedAgents = (usersByRole.get("agent") ?? []).filter((agent) => !assignedAgentIds.has(agent.id));
		return {
			executives: [...(usersByRole.get("super_admin") ?? []), ...(usersByRole.get("executive_viewer") ?? [])],
			functionalManagers: [
				{ role: "ops_manager", users: usersByRole.get("ops_manager") ?? [] },
				{ role: "compliance_officer", users: usersByRole.get("compliance_officer") ?? [] },
				{ role: "hr_manager", users: usersByRole.get("hr_manager") ?? [] },
				{ role: "finance_manager", users: usersByRole.get("finance_manager") ?? [] },
				{ role: "it_manager", users: usersByRole.get("it_manager") ?? [] },
				{ role: "training_manager", users: usersByRole.get("training_manager") ?? [] },
			],
			stations: stationRows,
			unassignedAgents,
		};
	}

	async create(
		dto: CreateStaffUserDto,
		actorId: string | undefined,
		actorRoles: readonly WezAdminRole[],
		auditContext: AuditRequestContext | undefined,
	) {
		if (!isStaffRole(dto.primaryRole)) throw new BadRequestException({ code: "INVALID_STAFF_ROLE" });
		this.assertCanManageRole(actorRoles, dto.primaryRole);
		const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
		if (existing) throw new ConflictException({ code: "STAFF_EMAIL_EXISTS" });
		const temporaryPassword = dto.temporaryPassword ?? this.generateTemporaryPassword();
		const { user } = await adminAuth.api.signUpEmail({
			body: { name: dto.name, email: dto.email, password: temporaryPassword },
		});
		const updated = await this.prisma.adminUser.update({
			where: { id: user.id },
			data: { role: dto.primaryRole },
		});
		await this.auditEvents.recordEvent({
			actorId,
			actorRole: this.actorRole(actorRoles),
			action: AUDIT_ACTIONS.staffUserCreated,
			targetType: AUDIT_TARGET_TYPES.staffUser,
			targetId: updated.id,
			context: auditContext,
			metadata: { primaryRole: dto.primaryRole },
		});
		return { user: updated, temporaryPassword };
	}

	async update(
		id: string,
		dto: UpdateStaffUserDto,
		actorId: string | undefined,
		actorRoles: readonly WezAdminRole[],
		auditContext: AuditRequestContext | undefined,
	) {
		const existing = await this.get(id);
		if (dto.primaryRole) {
			this.assertCanManageRole(actorRoles, dto.primaryRole);
		}
		if (dto.email && dto.email !== existing.email) {
			const emailOwner = await this.prisma.adminUser.findUnique({ where: { email: dto.email }, select: { id: true } });
			if (emailOwner) throw new ConflictException({ code: "STAFF_EMAIL_EXISTS" });
		}
		return this.prisma.$transaction(async (tx) => {
			const updated = await tx.adminUser.update({
				where: { id },
				data: {
					name: dto.name,
					email: dto.email,
					role: dto.primaryRole,
					active: dto.active,
				},
			});
			const roleChangedAwayFromAgent =
				dto.primaryRole !== undefined && existing.role === "agent" && dto.primaryRole !== "agent";
			const roleChangedAwayFromSupervisor =
				dto.primaryRole !== undefined &&
				existing.role === "station_supervisor" &&
				dto.primaryRole !== "station_supervisor";
			if (dto.active === false || roleChangedAwayFromAgent) {
				await tx.agentAssignment.updateMany({
					where: { userId: id, active: true, removedAt: null },
					data: { active: false, removedAt: new Date() },
				});
			}
			if (dto.active === false || roleChangedAwayFromSupervisor) {
				await tx.station.updateMany({ where: { supervisorUserId: id }, data: { supervisorUserId: null } });
			}
			if (dto.active === false) {
				await tx.staffRoleAssignment.updateMany({
					where: { adminUserId: id, active: true, revokedAt: null },
					data: { active: false, revokedAt: new Date(), revokeReason: "Staff user deactivated" },
				});
			}
			await this.auditEvents.record(tx, {
				actorId,
				actorRole: this.actorRole(actorRoles),
				action: AUDIT_ACTIONS.staffUserUpdated,
				targetType: AUDIT_TARGET_TYPES.staffUser,
				targetId: id,
				context: auditContext,
				metadata: {
					primaryRole: dto.primaryRole,
					active: dto.active,
					emailChanged: dto.email !== undefined && dto.email !== existing.email,
				},
			});
			return updated;
		});
	}

	async assignRole(
		adminUserId: string,
		dto: AssignStaffRoleDto,
		actorId: string,
		actorRoles: readonly WezAdminRole[],
		auditContext: AuditRequestContext | undefined,
	) {
		await this.get(adminUserId);
		if (!isStaffRole(dto.role)) throw new BadRequestException({ code: "INVALID_STAFF_ROLE" });
		this.assertCanManageRole(actorRoles, dto.role);
		this.assertScope(dto);
		const existing = await this.prisma.staffRoleAssignment.findFirst({
			where: {
				adminUserId,
				role: dto.role,
				scopeType: dto.scopeType,
				scopeId: dto.scopeId ?? null,
				active: true,
				revokedAt: null,
			},
		});
		if (existing) throw new ConflictException({ code: "STAFF_ROLE_ALREADY_ASSIGNED" });
		await this.assertScopeTarget(dto.scopeType, dto.scopeId);
		return this.prisma.$transaction(async (tx) => {
			const assignment = await tx.staffRoleAssignment.create({
				data: {
					adminUserId,
					role: dto.role,
					scopeType: dto.scopeType,
					scopeId: dto.scopeId ?? null,
					assignedById: actorId,
				},
			});
			if (dto.scopeType === "station" && dto.scopeId) {
				if (dto.role === "agent") {
					const existingAgentAssignment = await tx.agentAssignment.findFirst({
						where: { userId: adminUserId, stationId: dto.scopeId, active: true, removedAt: null },
					});
					if (!existingAgentAssignment) {
						await tx.agentAssignment.create({ data: { userId: adminUserId, stationId: dto.scopeId, active: true } });
					}
				}
				if (dto.role === "station_supervisor") {
					await tx.station.update({ where: { id: dto.scopeId }, data: { supervisorUserId: adminUserId } });
				}
			}
			await this.auditEvents.record(tx, {
				actorId,
				actorRole: this.actorRole(actorRoles),
				action: AUDIT_ACTIONS.staffRoleAssigned,
				targetType: AUDIT_TARGET_TYPES.staffRoleAssignment,
				targetId: assignment.id,
				context: auditContext,
				metadata: {
					adminUserId,
					role: dto.role,
					scopeType: dto.scopeType,
					scopeId: dto.scopeId,
				},
			});
			return assignment;
		});
	}

	async revokeRole(
		assignmentId: string,
		reason: string | undefined,
		actorId: string | undefined,
		actorRoles: readonly WezAdminRole[],
		auditContext: AuditRequestContext | undefined,
	) {
		const assignment = await this.prisma.staffRoleAssignment.findUnique({ where: { id: assignmentId } });
		if (!assignment) throw new NotFoundException({ code: "STAFF_ROLE_ASSIGNMENT_NOT_FOUND" });
		if (!isStaffRole(assignment.role)) throw new BadRequestException({ code: "INVALID_STAFF_ROLE" });
		this.assertCanManageRole(actorRoles, assignment.role);
		return this.prisma.$transaction(async (tx) => {
			const revoked = await tx.staffRoleAssignment.update({
				where: { id: assignmentId },
				data: { active: false, revokedAt: new Date(), revokeReason: reason },
			});
			if (assignment.scopeType === "station" && assignment.scopeId) {
				if (assignment.role === "agent") {
					await tx.agentAssignment.updateMany({
						where: { userId: assignment.adminUserId, stationId: assignment.scopeId, active: true, removedAt: null },
						data: { active: false, removedAt: new Date() },
					});
				}
				if (assignment.role === "station_supervisor") {
					await tx.station.updateMany({
						where: { id: assignment.scopeId, supervisorUserId: assignment.adminUserId },
						data: { supervisorUserId: null },
					});
				}
			}
			await this.auditEvents.record(tx, {
				actorId,
				actorRole: this.actorRole(actorRoles),
				action: AUDIT_ACTIONS.staffRoleRevoked,
				targetType: AUDIT_TARGET_TYPES.staffRoleAssignment,
				targetId: assignmentId,
				context: auditContext,
				metadata: {
					adminUserId: assignment.adminUserId,
					role: assignment.role,
					scopeType: assignment.scopeType,
					scopeId: assignment.scopeId,
					reason,
				},
			});
			return revoked;
		});
	}

	private async get(id: string) {
		const user = await this.prisma.adminUser.findUnique({ where: { id } });
		if (!user) throw new NotFoundException({ code: "STAFF_USER_NOT_FOUND" });
		return user;
	}

	private scopeLabel(
		scopeType: string,
		scopeId: string | null,
		stationById: ReadonlyMap<string, string>,
		locationById: ReadonlyMap<string, string>,
	) {
		if (scopeType === ACCESS_SCOPE_TYPES.global) return null;
		if (!scopeId) return null;
		return scopeType === ACCESS_SCOPE_TYPES.station
			? (stationById.get(scopeId) ?? scopeId)
			: (locationById.get(scopeId) ?? scopeId);
	}

	private uniqueAccessRows(rows: readonly StaffAccessReviewRow[]) {
		return Array.from(
			new Map(
				rows.map((row) => [`${row.email}:${row.role}:${row.scopeType}:${row.scopeId ?? MISSING_SCOPE_KEY}`, row]),
			).values(),
		);
	}

	private assertScope(dto: AssignStaffRoleDto) {
		if (dto.scopeType === "global" && dto.scopeId) throw new BadRequestException({ code: "GLOBAL_SCOPE_HAS_NO_ID" });
		if (dto.scopeType !== "global" && !dto.scopeId) throw new BadRequestException({ code: "SCOPE_ID_REQUIRED" });
	}

	private async assertScopeTarget(scopeType: string, scopeId: string | undefined) {
		if (scopeType === "global" || !scopeId) return;
		if (scopeType === "station") {
			const station = await this.prisma.station.findUnique({ where: { id: scopeId }, select: { id: true } });
			if (!station) throw new BadRequestException({ code: "SCOPE_STATION_NOT_FOUND" });
			return;
		}
		const location = await this.prisma.location.findUnique({ where: { id: scopeId }, select: { kind: true } });
		if (!location || location.kind !== scopeType) throw new BadRequestException({ code: "SCOPE_LOCATION_NOT_FOUND" });
	}

	private assertCanManageRole(actorRoles: readonly WezAdminRole[], targetRole: string) {
		if (!isStaffRole(targetRole)) throw new BadRequestException({ code: "INVALID_STAFF_ROLE" });
		const role = targetRole as WezAdminRole;
		if (actorRoles.includes("super_admin")) return;
		if (actorRoles.includes("ops_manager") && !OPS_BLOCKED_ROLES.includes(role)) return;
		if (actorRoles.includes("hr_manager") && HR_MANAGED_ROLES.includes(role)) return;
		throw new BadRequestException({ code: "STAFF_ROLE_MANAGEMENT_NOT_ALLOWED" });
	}

	private generateTemporaryPassword(): string {
		return `${randomBytes(12).toString("base64url")}A1!`;
	}

	private actorRole(actorRoles: readonly WezAdminRole[]): string {
		return actorRoles[0] ?? "staff";
	}
}
