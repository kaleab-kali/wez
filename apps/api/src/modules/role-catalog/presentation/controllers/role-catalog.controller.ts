import { Body, Controller, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "#modules/auth/auth.config";
import { AdminPermissionsGuard, RequireAdminMin } from "#modules/admin/guards/admin-permissions.guard";
import { CreateRoleDto, UpdateRoleDto } from "../../application/dto/role.dto";
import { RoleCatalogService } from "../../application/services/role-catalog.service";

@ApiTags("Role Catalog")
@ApiBearerAuth()
@Controller("admin/role-catalog")
@UseGuards(AdminPermissionsGuard)
@RequireAdminMin("ops_manager")
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
	@ApiOperation({ summary: "Create a role" })
	@ApiBody({ type: CreateRoleDto })
	async create(@Body() dto: CreateRoleDto) {
		return { data: await this.service.create(dto) };
	}

	@Patch(":id")
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
	async list(@Req() req: any) {
		const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
		if (!session?.user) throw new UnauthorizedException();
		const data = await this.service.list(false);
		return { data, meta: { total: data.length } };
	}
}
