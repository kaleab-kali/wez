import { Body, Controller, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "#modules/auth/auth.config";
import { hasPermission, type Permission } from "#modules/auth/permissions";
import {
	CreateEmployerDto,
	ListEmployersDto,
	UpdateEmployerDto,
} from "../../application/dto/employer.dto";
import { EmployersService } from "../../application/services/employers.service";

const requireSession = async (req: any, permission?: Permission) => {
	const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
	if (!session?.user) throw new UnauthorizedException();
	const role = (session.user as { role?: string }).role;
	if (permission && !hasPermission(role, permission)) {
		throw new UnauthorizedException({ code: "MISSING_PERMISSION", message: permission });
	}
	return { session, role };
};

@ApiTags("Employers")
@ApiBearerAuth()
@Controller("employers")
export class EmployersController {
	constructor(private readonly service: EmployersService) {}

	@Get()
	@ApiOperation({ summary: "List employers (agent only by default)" })
	async list(@Query() filter: ListEmployersDto, @Req() req: any) {
		await requireSession(req, "employer:list");
		return this.service.list(filter);
	}

	@Get("me")
	@ApiOperation({ summary: "Get current user's employer profile (if any)" })
	async getMine(@Req() req: any) {
		const { session } = await requireSession(req);
		const e = await this.service.getMine(session.user.id);
		return { data: e };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get an employer by id" })
	async getById(@Param("id") id: string, @Req() req: any) {
		await requireSession(req, "employer:read");
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create an employer (agent-led or self-signup)" })
	@ApiBody({ type: CreateEmployerDto })
	async create(@Body() dto: CreateEmployerDto, @Req() req: any) {
		const { session, role } = await requireSession(req);
		const isAgent = role === "agent" || role === "station_supervisor";
		if (!isAgent && !hasPermission(role, "employer:create")) {
			// employers can self-create their OWN profile (rare; handled via signup flow)
			throw new UnauthorizedException({ code: "MISSING_PERMISSION" });
		}
		return { data: await this.service.create(session.user.id, dto, isAgent) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update an employer" })
	@ApiBody({ type: UpdateEmployerDto })
	async update(@Param("id") id: string, @Body() dto: UpdateEmployerDto, @Req() req: any) {
		await requireSession(req, "employer:update");
		return { data: await this.service.update(id, dto) };
	}
}
