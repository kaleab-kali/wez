import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { requirePermission } from "#shared/auth/session";
import {
	ListWorkersDto,
	RegisterWorkerDto,
	UpdateWorkerDto,
} from "../../application/dto/worker.dto";
import { WorkersService } from "../../application/services/workers.service";

@ApiTags("Workers")
@ApiBearerAuth()
@Controller("workers")
export class WorkersController {
	constructor(private readonly service: WorkersService) {}

	@Get()
	@ApiOperation({ summary: "Browse workers with filters" })
	async list(@Query() filter: ListWorkersDto, @Req() req: any) {
		await requirePermission(req, "worker:list");
		return this.service.list(filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a worker profile" })
	async getById(@Param("id") id: string, @Req() req: any) {
		await requirePermission(req, "worker:read");
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Register a worker (agent / staff only, in-station)" })
	@ApiBody({ type: RegisterWorkerDto })
	async register(@Body() dto: RegisterWorkerDto, @Req() req: any) {
		const s = await requirePermission(req, "worker:create");
		return { data: await this.service.register(s.user.id, dto) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a worker" })
	@ApiBody({ type: UpdateWorkerDto })
	async update(@Param("id") id: string, @Body() dto: UpdateWorkerDto, @Req() req: any) {
		await requirePermission(req, "worker:update");
		return { data: await this.service.update(id, dto) };
	}
}
