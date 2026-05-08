import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminRole } from "#modules/admin/guards/admin-permissions.guard";
import { requireSession, type WezRequest } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { AssignAgentDto, CreateStationDto, UpdateStationDto } from "../../application/dto/station.dto";
import { StationsService } from "../../application/services/stations.service";

@ApiTags("Stations")
@ApiBearerAuth()
@Controller("admin/stations")
@UseGuards(AdminPermissionsGuard)
@RequireAdminRole("super_admin", "ops_manager")
export class StationsController {
	constructor(private readonly service: StationsService) {}

	@Get()
	@RequireAdminRole("super_admin", "ops_manager", "hr_manager")
	@ApiOperation({ summary: "List all stations" })
	@ApiResponse({ status: 200, description: "Paginated list" })
	async list(@Query("includeInactive") includeInactive?: string) {
		const data = await this.service.list(includeInactive === "true");
		return { data, meta: { total: data.length } };
	}

	@Get(":id")
	@RequireAdminRole("super_admin", "ops_manager", "hr_manager")
	@ApiOperation({ summary: "Get a station by id" })
	async findById(@Param("id") id: string) {
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a station" })
	@ApiBody({ type: CreateStationDto })
	@ApiResponse({ status: 201, description: "Created" })
	async create(@Body() dto: CreateStationDto, @Req() req: WezRequest & { adminUser?: { id: string; role?: string } }) {
		return {
			data: await this.service.create(dto, {
				actorId: req.adminUser?.id,
				actorRole: req.adminUser?.role,
				context: req.auditContext,
			}),
		};
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a station" })
	@ApiBody({ type: UpdateStationDto })
	async update(
		@Param("id") id: string,
		@Body() dto: UpdateStationDto,
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

	@Get(":id/assignments")
	@RequireAdminRole("super_admin", "ops_manager", "hr_manager")
	@ApiOperation({ summary: "List active agent assignments at a station" })
	async listAssignments(@Param("id") id: string) {
		return { data: await this.service.listAssignments(id) };
	}

	@Post(":id/assignments")
	@ApiOperation({ summary: "Assign an agent to a station" })
	@ApiBody({ type: AssignAgentDto })
	async assign(
		@Param("id") id: string,
		@Body() dto: AssignAgentDto,
		@Req() req: WezRequest & { adminUser?: { id: string; role?: string } },
	) {
		return {
			data: await this.service.assignAgent(id, dto.userId, {
				actorId: req.adminUser?.id,
				actorRole: req.adminUser?.role,
				context: req.auditContext,
			}),
		};
	}

	@Delete("assignments/:assignmentId")
	@ApiOperation({ summary: "Remove an agent assignment" })
	async unassign(
		@Param("assignmentId") assignmentId: string,
		@Req() req: WezRequest & { adminUser?: { id: string; role?: string } },
	) {
		return {
			data: await this.service.removeAssignment(assignmentId, {
				actorId: req.adminUser?.id,
				actorRole: req.adminUser?.role,
				context: req.auditContext,
			}),
		};
	}
}

@ApiTags("Stations (read-only)")
@Controller("stations")
export class StationsPublicController {
	constructor(
		private readonly service: StationsService,
		private readonly staffAccess: StaffAccessService,
	) {}

	@Get()
	@ApiOperation({ summary: "List active stations (any authenticated user)" })
	async list(@Req() req: WezRequest) {
		const session = await requireSession(req);
		const allStations = await this.service.list(false);
		const stationIds = session.kind === "staff" ? await this.staffAccess.stationIdsForSession(session) : [];
		const scopedStaff = session.kind === "staff" && this.staffAccess.isStationScoped(session);
		const data = scopedStaff ? allStations.filter((station) => stationIds.includes(station.id)) : allStations;
		return { data, meta: { total: data.length } };
	}
}
