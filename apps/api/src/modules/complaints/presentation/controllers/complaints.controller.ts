import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import {
	CloseComplaintDto,
	CreateComplaintDto,
	ListComplaintsDto,
	ReferComplaintExternalDto,
} from "../../application/dto/complaint.dto";
import { ComplaintsService } from "../../application/services/complaints.service";

@ApiTags("Complaints")
@ApiBearerAuth()
@Controller("complaints")
export class ComplaintsController {
	constructor(private readonly service: ComplaintsService) {}

	@Get()
	@ApiOperation({ summary: "List complaints visible to the current user" })
	@ApiResponse({ status: 200, description: "Complaints returned" })
	async list(@Query() filter: ListComplaintsDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "complaint:list");
		return this.service.listForSession(session, filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a complaint by id" })
	@ApiResponse({ status: 200, description: "Complaint returned" })
	async getById(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "complaint:read");
		return { data: await this.service.getByIdForSession(session, id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a complaint" })
	@ApiBody({ type: CreateComplaintDto })
	@ApiResponse({ status: 201, description: "Complaint created" })
	async create(@Body() dto: CreateComplaintDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "complaint:create");
		return { data: await this.service.create(session, dto, req.auditContext) };
	}

	@Post(":id/mediate")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Move an open complaint into mediation" })
	@ApiResponse({ status: 200, description: "Complaint marked as mediating" })
	async mediate(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "complaint:mediate");
		return { data: await this.service.markMediating(session, id, req.auditContext) };
	}

	@Post(":id/refer-external")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Refer a complaint to an external authority" })
	@ApiBody({ type: ReferComplaintExternalDto })
	@ApiResponse({ status: 200, description: "Complaint referred externally" })
	async referExternal(@Param("id") id: string, @Body() dto: ReferComplaintExternalDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "complaint:refer_external");
		return { data: await this.service.referExternal(session, id, dto, req.auditContext) };
	}

	@Post(":id/close")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Close a complaint with resolution and side effects" })
	@ApiBody({ type: CloseComplaintDto })
	@ApiResponse({ status: 200, description: "Complaint closed" })
	async close(@Param("id") id: string, @Body() dto: CloseComplaintDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "complaint:close");
		return { data: await this.service.close(session, id, dto, req.auditContext) };
	}
}
