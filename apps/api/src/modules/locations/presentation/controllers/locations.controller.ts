import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminRole } from "#modules/admin/guards/admin-permissions.guard";
import type { WezRequest } from "#shared/auth/session";
import { CreateLocationDto, UpdateLocationDto } from "../../application/dto/location.dto";
import { LocationsService } from "../../application/services/locations.service";

@ApiTags("Locations")
@ApiBearerAuth()
@Controller("admin/locations")
@UseGuards(AdminPermissionsGuard)
@RequireAdminRole("super_admin", "ops_manager")
export class LocationsAdminController {
	constructor(private readonly service: LocationsService) {}

	@Get()
	@RequireAdminRole("super_admin", "ops_manager", "hr_manager")
	@ApiOperation({ summary: "List lookup-managed locations" })
	@ApiResponse({ status: 200, description: "Locations returned" })
	async list(
		@Query("kind") kind?: string,
		@Query("parentId") parentId?: string,
		@Query("includeInactive") includeInactive?: string,
	) {
		const data = await this.service.list({ kind, parentId, includeInactive: includeInactive === "true" });
		return { data, meta: { total: data.length } };
	}

	@Post()
	@ApiOperation({ summary: "Create a lookup-managed location" })
	@ApiBody({ type: CreateLocationDto })
	async create(@Body() dto: CreateLocationDto, @Req() req: WezRequest & { adminUser?: { id: string; role?: string } }) {
		return {
			data: await this.service.create(dto, {
				actorId: req.adminUser?.id,
				actorRole: req.adminUser?.role,
				context: req.auditContext,
			}),
		};
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a lookup-managed location" })
	@ApiBody({ type: UpdateLocationDto })
	async update(
		@Param("id") id: string,
		@Body() dto: UpdateLocationDto,
		@Req() req: WezRequest & { adminUser?: { id: string; role?: string } },
	) {
		return {
			data: await this.service.update(id, dto, {
				actorId: req.adminUser?.id,
				actorRole: req.adminUser?.role,
				context: req.auditContext,
			}),
		};
	}

	@Delete(":id")
	@ApiOperation({ summary: "Deactivate a lookup-managed location" })
	async deactivate(@Param("id") id: string, @Req() req: WezRequest & { adminUser?: { id: string; role?: string } }) {
		return {
			data: await this.service.deactivate(id, {
				actorId: req.adminUser?.id,
				actorRole: req.adminUser?.role,
				context: req.auditContext,
			}),
		};
	}
}

@ApiTags("Locations (read-only)")
@Controller("locations")
export class LocationsPublicController {
	constructor(private readonly service: LocationsService) {}

	@Get()
	@ApiOperation({ summary: "List active locations for public forms and authenticated users" })
	async list(@Query("kind") kind?: string, @Query("parentId") parentId?: string) {
		const data = await this.service.list({ kind, parentId, includeInactive: false });
		return { data, meta: { total: data.length } };
	}
}
