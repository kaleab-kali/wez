import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminMin } from "#modules/admin/guards/admin-permissions.guard";
import { requireSession } from "#shared/auth/session";
import { CreateLookupDto, UpdateLookupDto } from "../../application/dto/lookup.dto";
import { LookupsService } from "../../application/services/lookups.service";

@ApiTags("Lookups")
@ApiBearerAuth()
@Controller("admin/lookups")
@UseGuards(AdminPermissionsGuard)
@RequireAdminMin("ops_manager")
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
	@ApiOperation({ summary: "Create a lookup" })
	@ApiBody({ type: CreateLookupDto })
	async create(@Body() dto: CreateLookupDto) {
		return { data: await this.service.create(dto) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a lookup" })
	@ApiBody({ type: UpdateLookupDto })
	async update(@Param("id") id: string, @Body() dto: UpdateLookupDto) {
		return { data: await this.service.update(id, dto) };
	}
}

@ApiTags("Lookups (read-only)")
@Controller("lookups")
export class LookupsPublicController {
	constructor(private readonly service: LookupsService) {}

	@Get(":kind")
	@ApiOperation({ summary: "List active lookups for a kind (any authenticated user)" })
	async list(@Param("kind") kind: string, @Req() req: any) {
		await requireSession(req);
		const data = await this.service.listByKind(kind, false);
		return { data, meta: { total: data.length } };
	}
}
