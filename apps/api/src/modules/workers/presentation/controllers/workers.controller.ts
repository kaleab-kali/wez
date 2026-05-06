import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { ListWorkersDto, RegisterWorkerDto, UpdateWorkerDto } from "../../application/dto/worker.dto";
import { WorkersService } from "../../application/services/workers.service";
import type { Worker } from "../../domain/entities/worker.entity";

@ApiTags("Workers")
@ApiBearerAuth()
@Controller("workers")
export class WorkersController {
	constructor(private readonly service: WorkersService) {}

	@Get()
	@ApiOperation({ summary: "Browse workers with filters" })
	async list(@Query() filter: ListWorkersDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "worker:list");
		const scopedFilter =
			session.kind === "staff" ? filter : { ...filter, availableOnly: filter.availableOnly ?? true, hideFlagged: true };
		const result = await this.service.list(scopedFilter);
		if (session.kind === "staff") {
			return result;
		}
		return { ...result, data: result.data.map(toCustomerWorker) };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a worker profile" })
	async getById(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "worker:read");
		const worker = await this.service.getById(id);
		return { data: session.kind === "staff" ? worker : toCustomerWorker(worker) };
	}

	@Post()
	@ApiOperation({ summary: "Register a worker (agent / staff only, in-station)" })
	@ApiBody({ type: RegisterWorkerDto })
	async register(@Body() dto: RegisterWorkerDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "worker:create");
		return { data: await this.service.register(s.user.id, dto) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a worker" })
	@ApiBody({ type: UpdateWorkerDto })
	async update(@Param("id") id: string, @Body() dto: UpdateWorkerDto, @Req() req: WezRequest) {
		await requirePermission(req, "worker:update");
		return { data: await this.service.update(id, dto) };
	}
}

const toCustomerWorker = (worker: Worker): Worker => ({
	...worker,
	fayda: "",
	phone: "",
});
