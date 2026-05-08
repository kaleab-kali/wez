import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminRole } from "#modules/admin/guards/admin-permissions.guard";
import type { WezAdminRole } from "#modules/auth/permissions";
import type { WezRequest } from "#shared/auth/session";
import {
	AssignStaffRoleDto,
	CreateStaffUserDto,
	RevokeStaffRoleDto,
	UpdateStaffUserDto,
} from "../../application/dto/staff-user.dto";
import { StaffUsersService } from "../../application/services/staff-users.service";

@ApiTags("Staff users")
@ApiBearerAuth()
@Controller("admin/staff-users")
@UseGuards(AdminPermissionsGuard)
@RequireAdminRole("super_admin", "ops_manager", "hr_manager")
export class StaffUsersController {
	constructor(private readonly service: StaffUsersService) {}

	@Get()
	@ApiOperation({ summary: "List staff users and active role assignments" })
	@ApiResponse({ status: 200, description: "Staff users returned" })
	async list() {
		const data = await this.service.list();
		return { data, meta: { total: data.length } };
	}

	@Post()
	@ApiOperation({ summary: "Create a staff user with a primary role" })
	@ApiBody({ type: CreateStaffUserDto })
	async create(
		@Body() dto: CreateStaffUserDto,
		@Req() req: WezRequest & { adminUser?: { id: string; roles?: WezAdminRole[] } },
	) {
		return { data: await this.service.create(dto, req.adminUser?.id, req.adminUser?.roles ?? [], req.auditContext) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update staff user profile, primary role, or active status" })
	@ApiBody({ type: UpdateStaffUserDto })
	async update(
		@Param("id") id: string,
		@Body() dto: UpdateStaffUserDto,
		@Req() req: WezRequest & { adminUser?: { id: string; roles?: WezAdminRole[] } },
	) {
		return {
			data: await this.service.update(id, dto, req.adminUser?.id, req.adminUser?.roles ?? [], req.auditContext),
		};
	}

	@Post(":id/role-assignments")
	@ApiOperation({ summary: "Assign an additional role and scope to a staff user" })
	@ApiBody({ type: AssignStaffRoleDto })
	async assignRole(
		@Param("id") id: string,
		@Body() dto: AssignStaffRoleDto,
		@Req() req: WezRequest & { adminUser?: { id: string; roles?: WezAdminRole[] } },
	) {
		return {
			data: await this.service.assignRole(
				id,
				dto,
				req.adminUser?.id ?? "system",
				req.adminUser?.roles ?? [],
				req.auditContext,
			),
		};
	}

	@Post("role-assignments/:assignmentId/revoke")
	@ApiOperation({ summary: "Revoke a staff role assignment" })
	@ApiBody({ type: RevokeStaffRoleDto })
	async revokeRole(
		@Param("assignmentId") assignmentId: string,
		@Body() dto: RevokeStaffRoleDto,
		@Req() req: WezRequest & { adminUser?: { id: string; roles?: WezAdminRole[] } },
	) {
		return {
			data: await this.service.revokeRole(
				assignmentId,
				dto.reason,
				req.adminUser?.id,
				req.adminUser?.roles ?? [],
				req.auditContext,
			),
		};
	}
}
