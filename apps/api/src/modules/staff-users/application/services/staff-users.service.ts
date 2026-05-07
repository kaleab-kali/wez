import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { isStaffRole, type WezAdminRole } from "#modules/auth/permissions";
import { PrismaService } from "#shared/database/prisma.service";
import type { AssignStaffRoleDto, CreateStaffUserDto, UpdateStaffUserDto } from "../dto/staff-user.dto";

const HR_MANAGED_ROLES: readonly WezAdminRole[] = ["agent", "station_supervisor", "instructor", "support"];
const OPS_BLOCKED_ROLES: readonly WezAdminRole[] = ["super_admin"];

@Injectable()
export class StaffUsersService {
	constructor(private readonly prisma: PrismaService) {}

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

	async create(dto: CreateStaffUserDto, actorId: string, actorRoles: readonly WezAdminRole[]) {
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
		await this.assignRole(updated.id, { role: dto.primaryRole, scopeType: "global" }, actorId, actorRoles);
		return { user: updated, temporaryPassword };
	}

	async update(id: string, dto: UpdateStaffUserDto, actorRoles: readonly WezAdminRole[]) {
		await this.get(id);
		if (dto.primaryRole) {
			this.assertCanManageRole(actorRoles, dto.primaryRole);
		}
		return this.prisma.adminUser.update({
			where: { id },
			data: {
				name: dto.name,
				email: dto.email,
				role: dto.primaryRole,
				active: dto.active,
			},
		});
	}

	async assignRole(adminUserId: string, dto: AssignStaffRoleDto, actorId: string, actorRoles: readonly WezAdminRole[]) {
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
			return assignment;
		});
	}

	async revokeRole(assignmentId: string, reason: string | undefined) {
		const assignment = await this.prisma.staffRoleAssignment.findUnique({ where: { id: assignmentId } });
		if (!assignment) throw new NotFoundException({ code: "STAFF_ROLE_ASSIGNMENT_NOT_FOUND" });
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
			return revoked;
		});
	}

	private async get(id: string) {
		const user = await this.prisma.adminUser.findUnique({ where: { id } });
		if (!user) throw new NotFoundException({ code: "STAFF_USER_NOT_FOUND" });
		return user;
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

	private assertCanManageRole(actorRoles: readonly WezAdminRole[], targetRole: WezAdminRole) {
		if (actorRoles.includes("super_admin")) return;
		if (actorRoles.includes("ops_manager") && !OPS_BLOCKED_ROLES.includes(targetRole)) return;
		if (actorRoles.includes("hr_manager") && HR_MANAGED_ROLES.includes(targetRole)) return;
		throw new BadRequestException({ code: "STAFF_ROLE_MANAGEMENT_NOT_ALLOWED" });
	}

	private generateTemporaryPassword(): string {
		return `${randomBytes(12).toString("base64url")}A1!`;
	}
}
