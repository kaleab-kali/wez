import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminRole } from "#modules/admin/guards/admin-permissions.guard";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requireSession, type WezRequest } from "#shared/auth/session";
import { CreateRoleDto, UpdateRoleDto } from "../../application/dto/role.dto";
import { RoleCatalogService } from "../../application/services/role-catalog.service";

@ApiTags("Role Catalog")
@ApiBearerAuth()
@Controller("admin/role-catalog")
@UseGuards(AdminPermissionsGuard)
@RequireAdminRole("super_admin", "ops_manager")
export class RoleCatalogAdminController {
	constructor(private readonly service: RoleCatalogService) {}

	@Get()
	@ApiOperation({ summary: "List all roles (HQ)" })
	async list(@Query("includeInactive") includeInactive?: string) {
		const data = await this.service.list(includeInactive === "true");
		return { data, meta: { total: data.length } };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a role by id" })
	async findById(@Param("id") id: string) {
		return { data: await this.service.getById(id) };
	}

	@Post()
	@AuditLog(AUDIT_ACTIONS.roleCatalogCreated, { mode: "auto", targetType: AUDIT_TARGET_TYPES.roleCatalog })
	@ApiOperation({ summary: "Create a role" })
	@ApiBody({ type: CreateRoleDto })
	async create(@Body() dto: CreateRoleDto) {
		return { data: await this.service.create(dto) };
	}

	@Patch(":id")
	@AuditLog(AUDIT_ACTIONS.roleCatalogUpdated, {
		mode: "auto",
		targetIdParam: "id",
		targetType: AUDIT_TARGET_TYPES.roleCatalog,
	})
	@ApiOperation({ summary: "Update a role" })
	@ApiBody({ type: UpdateRoleDto })
	async update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
		return { data: await this.service.update(id, dto) };
	}
}

@ApiTags("Role Catalog (read-only)")
@Controller("role-catalog")
export class RoleCatalogPublicController {
	constructor(private readonly service: RoleCatalogService) {}

	@Get()
	@ApiOperation({ summary: "List active roles (any authenticated user)" })
	async list(@Req() req: WezRequest) {
		await requireSession(req);
		const data = await this.service.list(false);
		return { data, meta: { total: data.length } };
	}
}
