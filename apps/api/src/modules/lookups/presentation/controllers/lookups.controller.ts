import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { AdminPermissionsGuard, RequireAdminRole } from "#modules/admin/guards/admin-permissions.guard";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { CreateLookupDto, UpdateLookupDto } from "../../application/dto/lookup.dto";
import { LookupsService } from "../../application/services/lookups.service";

@ApiTags("Lookups")
@ApiBearerAuth()
@Controller("admin/lookups")
@UseGuards(AdminPermissionsGuard)
@RequireAdminRole("super_admin", "ops_manager")
export class LookupsAdminController {
	constructor(private readonly service: LookupsService) {}

	@Get()
	@ApiOperation({ summary: "List all lookups (HQ)" })
	async list(@Query("kind") kind?: string, @Query("includeArchived") includeArchived?: string) {
		const archived = includeArchived === "true";
		const data = kind ? await this.service.listByKind(kind, archived) : await this.service.listAll(archived);
		return { data, meta: { total: data.length } };
	}

	@Post()
	@AuditLog(AUDIT_ACTIONS.lookupCreated, { mode: "auto", targetType: AUDIT_TARGET_TYPES.lookup })
	@ApiOperation({ summary: "Create a lookup" })
	@ApiBody({ type: CreateLookupDto })
	async create(@Body() dto: CreateLookupDto) {
		return { data: await this.service.create(dto) };
	}

	@Patch(":id")
	@AuditLog(AUDIT_ACTIONS.lookupUpdated, { mode: "auto", targetIdParam: "id", targetType: AUDIT_TARGET_TYPES.lookup })
	@ApiOperation({ summary: "Update a lookup" })
	@ApiBody({ type: UpdateLookupDto })
	async update(@Param("id") id: string, @Body() dto: UpdateLookupDto) {
		return { data: await this.service.update(id, dto) };
	}
}

@ApiTags("Lookups (read-only)")
@AllowAnonymous()
@Controller("lookups")
export class LookupsPublicController {
	constructor(private readonly service: LookupsService) {}

	@Get(":kind")
	@ApiOperation({ summary: "List active lookups for a kind" })
	async list(@Param("kind") kind: string) {
		const data = await this.service.listByKind(kind, false);
		return { data, meta: { total: data.length } };
	}
}
