import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import {
	CancelHireRequestDto,
	CreateHireRequestDto,
	ListHireRequestsDto,
} from "../../application/dto/hire-request.dto";
import { HireRequestsService } from "../../application/services/hire-requests.service";

@ApiTags("HireRequests")
@ApiBearerAuth()
@Controller("hire-requests")
export class HireRequestsController {
	constructor(private readonly service: HireRequestsService) {}

	@Get()
	@ApiOperation({ summary: "List hire requests" })
	@ApiResponse({ status: 200, description: "Hire requests returned" })
	async list(@Query() filter: ListHireRequestsDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "hire_request:list");
		return this.service.listForSession(s, filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a hire request by id" })
	@ApiResponse({ status: 200, description: "Hire request returned" })
	async getById(@Param("id") id: string, @Req() req: WezRequest) {
		const s = await requirePermission(req, "hire_request:read");
		return { data: await this.service.getByIdForSession(s, id) };
	}

	@Post()
	@AuditLog(AUDIT_ACTIONS.hireRequestCreated, { mode: "auto", targetType: AUDIT_TARGET_TYPES.hireRequest })
	@ApiOperation({ summary: "Create a hire request" })
	@ApiBody({ type: CreateHireRequestDto })
	@ApiResponse({ status: 201, description: "Hire request created" })
	async create(@Body() dto: CreateHireRequestDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "hire_request:create");
		const isStaff = s.kind === "staff";
		return { data: await this.service.create(s.user.id, dto, isStaff, s) };
	}

	@Post(":id/cancel")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.hireRequestCancelled, {
		mode: "auto",
		targetIdParam: "id",
		targetType: AUDIT_TARGET_TYPES.hireRequest,
	})
	@ApiOperation({ summary: "Cancel a hire request" })
	@ApiBody({ type: CancelHireRequestDto })
	@ApiResponse({ status: 200, description: "Hire request cancelled" })
	async cancel(@Param("id") id: string, @Body() dto: CancelHireRequestDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "hire_request:cancel");
		return { data: await this.service.cancelForSession(s, id, dto) };
	}
}
