import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminMin } from "#modules/admin/guards/admin-permissions.guard";
import { requireSession, type WezRequest } from "#shared/auth/session";
import { AssignAgentDto, CreateStationDto, UpdateStationDto } from "../../application/dto/station.dto";
import { StationsService } from "../../application/services/stations.service";

@ApiTags("Stations")
@ApiBearerAuth()
@Controller("admin/stations")
@UseGuards(AdminPermissionsGuard)
@RequireAdminMin("ops_manager")
export class StationsController {
	constructor(private readonly service: StationsService) {}

	@Get()
	@ApiOperation({ summary: "List all stations" })
	@ApiResponse({ status: 200, description: "Paginated list" })
	async list(@Query("includeInactive") includeInactive?: string) {
		const data = await this.service.list(includeInactive === "true");
		return { data, meta: { total: data.length } };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a station by id" })
	async findById(@Param("id") id: string) {
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a station" })
	@ApiBody({ type: CreateStationDto })
	@ApiResponse({ status: 201, description: "Created" })
	async create(@Body() dto: CreateStationDto) {
		return { data: await this.service.create(dto) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a station" })
	@ApiBody({ type: UpdateStationDto })
	async update(@Param("id") id: string, @Body() dto: UpdateStationDto) {
		return { data: await this.service.update(id, dto) };
	}

	@Get(":id/assignments")
	@ApiOperation({ summary: "List active agent assignments at a station" })
	async listAssignments(@Param("id") id: string) {
		return { data: await this.service.listAssignments(id) };
	}

	@Post(":id/assignments")
	@ApiOperation({ summary: "Assign an agent to a station" })
	@ApiBody({ type: AssignAgentDto })
	async assign(@Param("id") id: string, @Body() dto: AssignAgentDto) {
		return { data: await this.service.assignAgent(id, dto.userId) };
	}

	@Delete("assignments/:assignmentId")
	@ApiOperation({ summary: "Remove an agent assignment" })
	async unassign(@Param("assignmentId") assignmentId: string) {
		return { data: await this.service.removeAssignment(assignmentId) };
	}
}

@ApiTags("Stations (read-only)")
@Controller("stations")
export class StationsPublicController {
	constructor(private readonly service: StationsService) {}

	@Get()
	@ApiOperation({ summary: "List active stations (any authenticated user)" })
	async list(@Req() req: WezRequest) {
		await requireSession(req);
		const data = await this.service.list(false);
		return { data, meta: { total: data.length } };
	}
}
