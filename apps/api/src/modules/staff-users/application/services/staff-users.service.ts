import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { isStaffRole } from "#modules/auth/permissions";
import { PrismaService } from "#shared/database/prisma.service";
import type { AssignStaffRoleDto, CreateStaffUserDto, UpdateStaffUserDto } from "../dto/staff-user.dto";

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

	async create(dto: CreateStaffUserDto, actorId: string) {
		if (!isStaffRole(dto.primaryRole)) throw new BadRequestException({ code: "INVALID_STAFF_ROLE" });
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
		await this.assignRole(updated.id, { role: dto.primaryRole, scopeType: "global" }, actorId);
		return { user: updated, temporaryPassword };
	}

	async update(id: string, dto: UpdateStaffUserDto) {
		await this.get(id);
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

	async assignRole(adminUserId: string, dto: AssignStaffRoleDto, actorId: string) {
		await this.get(adminUserId);
		if (!isStaffRole(dto.role)) throw new BadRequestException({ code: "INVALID_STAFF_ROLE" });
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
		return this.prisma.staffRoleAssignment.create({
			data: {
				adminUserId,
				role: dto.role,
				scopeType: dto.scopeType,
				scopeId: dto.scopeId ?? null,
				assignedById: actorId,
			},
		});
	}

	async revokeRole(assignmentId: string, reason: string | undefined) {
		const assignment = await this.prisma.staffRoleAssignment.findUnique({ where: { id: assignmentId } });
		if (!assignment) throw new NotFoundException({ code: "STAFF_ROLE_ASSIGNMENT_NOT_FOUND" });
		return this.prisma.staffRoleAssignment.update({
			where: { id: assignmentId },
			data: { active: false, revokedAt: new Date(), revokeReason: reason },
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

	private generateTemporaryPassword(): string {
		return `${randomBytes(12).toString("base64url")}A1!`;
	}
}
