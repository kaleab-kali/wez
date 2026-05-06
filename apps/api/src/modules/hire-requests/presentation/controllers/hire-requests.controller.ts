import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { requirePermission } from "#shared/auth/session";
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
	async list(@Query() filter: ListHireRequestsDto, @Req() req: any) {
		await requirePermission(req, "hire_request:list");
		return this.service.list(filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a hire request by id" })
	async getById(@Param("id") id: string, @Req() req: any) {
		await requirePermission(req, "hire_request:read");
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a hire request" })
	@ApiBody({ type: CreateHireRequestDto })
	async create(@Body() dto: CreateHireRequestDto, @Req() req: any) {
		const s = await requirePermission(req, "hire_request:create");
		const isStaff = s.kind === "staff";
		return { data: await this.service.create(s.user.id, dto, isStaff) };
	}

	@Post(":id/cancel")
	@ApiOperation({ summary: "Cancel a hire request" })
	@ApiBody({ type: CancelHireRequestDto })
	async cancel(@Param("id") id: string, @Body() dto: CancelHireRequestDto, @Req() req: any) {
		await requirePermission(req, "hire_request:cancel");
		return { data: await this.service.cancel(id, dto) };
	}
}
