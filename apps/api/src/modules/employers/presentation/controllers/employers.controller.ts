import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "#modules/auth/guards/wez-auth.guard";
import { requirePermission, requireSession, type WezRequest } from "#shared/auth/session";
import {
	CreateEmployerDto,
	ListEmployersDto,
	SignupEmployerDto,
	UpdateEmployerDto,
} from "../../application/dto/employer.dto";
import { EmployersService } from "../../application/services/employers.service";

@ApiTags("Employers")
@ApiBearerAuth()
@Controller("employers")
export class EmployersController {
	constructor(private readonly service: EmployersService) {}

	@Get()
	@ApiOperation({ summary: "List employers (staff only)" })
	@ApiResponse({ status: 200, description: "Employers returned" })
	async list(@Query() filter: ListEmployersDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "employer:list");
		return this.service.listForSession(session, filter);
	}

	@Get("me")
	@ApiOperation({ summary: "Get current customer's employer profile (if any)" })
	@ApiResponse({ status: 200, description: "Current employer profile returned" })
	async getMine(@Req() req: WezRequest) {
		const s = await requireSession(req);
		const e = await this.service.getMine(s.user.id);
		return { data: e };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get an employer by id" })
	@ApiResponse({ status: 200, description: "Employer returned" })
	async getById(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "employer:read");
		return { data: await this.service.getByIdForSession(session, id) };
	}

	@Post("signup")
	@Public()
	@ApiOperation({ summary: "Create customer login and employer profile" })
	@ApiBody({ type: SignupEmployerDto })
	@ApiResponse({ status: 201, description: "Employer login and profile created" })
	async signup(@Body() dto: SignupEmployerDto) {
		return { data: await this.service.signup(dto) };
	}

	@Post()
	@ApiOperation({ summary: "Create an employer (staff agent-led or customer self-signup)" })
	@ApiBody({ type: CreateEmployerDto })
	@ApiResponse({ status: 201, description: "Employer created" })
	async create(@Body() dto: CreateEmployerDto, @Req() req: WezRequest) {
		const s = await requireSession(req);
		// Staff with employer:create permission OR a customer self-signing-up.
		const isStaff = s.kind === "staff";
		if (isStaff) {
			await requirePermission(req, "employer:create");
		}
		// Customer self-signup is always allowed (creates their own profile linked to their user).
		return { data: await this.service.create(s.user.id, dto, isStaff) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update an employer (staff only)" })
	@ApiBody({ type: UpdateEmployerDto })
	@ApiResponse({ status: 200, description: "Employer updated" })
	async update(@Param("id") id: string, @Body() dto: UpdateEmployerDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "employer:update");
		await this.service.getByIdForSession(session, id);
		return { data: await this.service.update(id, dto) };
	}
}
