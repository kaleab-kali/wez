import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "#modules/auth/auth.config";
import { hasPermission, type Permission } from "#modules/auth/permissions";
import {
	CancelHireRequestDto,
	CreateHireRequestDto,
	ListHireRequestsDto,
} from "../../application/dto/hire-request.dto";
import { HireRequestsService } from "../../application/services/hire-requests.service";

const requireSession = async (req: any, permission?: Permission) => {
	const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
	if (!session?.user) throw new UnauthorizedException();
	const role = (session.user as { role?: string }).role;
	if (permission && !hasPermission(role, permission)) {
		throw new UnauthorizedException({ code: "MISSING_PERMISSION", message: permission });
	}
	return { session, role };
};

@ApiTags("HireRequests")
@ApiBearerAuth()
@Controller("hire-requests")
export class HireRequestsController {
	constructor(private readonly service: HireRequestsService) {}

	@Get()
	@ApiOperation({ summary: "List hire requests" })
	async list(@Query() filter: ListHireRequestsDto, @Req() req: any) {
		await requireSession(req, "hire_request:list");
		return this.service.list(filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a hire request by id" })
	async getById(@Param("id") id: string, @Req() req: any) {
		await requireSession(req, "hire_request:read");
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a hire request" })
	@ApiBody({ type: CreateHireRequestDto })
	async create(@Body() dto: CreateHireRequestDto, @Req() req: any) {
		const { session, role } = await requireSession(req, "hire_request:create");
		const isAgent = role === "agent" || role === "station_supervisor";
		return { data: await this.service.create(session.user.id, dto, isAgent) };
	}

	@Post(":id/cancel")
	@ApiOperation({ summary: "Cancel a hire request" })
	@ApiBody({ type: CancelHireRequestDto })
	async cancel(@Param("id") id: string, @Body() dto: CancelHireRequestDto, @Req() req: any) {
		await requireSession(req, "hire_request:cancel");
		return { data: await this.service.cancel(id, dto) };
	}
}
