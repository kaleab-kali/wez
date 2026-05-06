import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { hasPermission } from "#modules/auth/permissions";
import { requirePermission, requireSession } from "#shared/auth/session";
import {
	CreateEmployerDto,
	ListEmployersDto,
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
	async list(@Query() filter: ListEmployersDto, @Req() req: any) {
		await requirePermission(req, "employer:list");
		return this.service.list(filter);
	}

	@Get("me")
	@ApiOperation({ summary: "Get current customer's employer profile (if any)" })
	async getMine(@Req() req: any) {
		const s = await requireSession(req);
		const e = await this.service.getMine(s.user.id);
		return { data: e };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get an employer by id" })
	async getById(@Param("id") id: string, @Req() req: any) {
		await requirePermission(req, "employer:read");
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create an employer (staff agent-led or customer self-signup)" })
	@ApiBody({ type: CreateEmployerDto })
	async create(@Body() dto: CreateEmployerDto, @Req() req: any) {
		const s = await requireSession(req);
		// Staff with employer:create permission OR a customer self-signing-up.
		const isStaff = s.kind === "staff";
		if (isStaff) {
			if (!hasPermission(s.user.role, "employer:create")) {
				throw new ForbiddenException({ code: "MISSING_PERMISSION" });
			}
		}
		// Customer self-signup is always allowed (creates their own profile linked to their user).
		return { data: await this.service.create(s.user.id, dto, isStaff) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update an employer (staff only)" })
	@ApiBody({ type: UpdateEmployerDto })
	async update(@Param("id") id: string, @Body() dto: UpdateEmployerDto, @Req() req: any) {
		await requirePermission(req, "employer:update");
		return { data: await this.service.update(id, dto) };
	}
}
