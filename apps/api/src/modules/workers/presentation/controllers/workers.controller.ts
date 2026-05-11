import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import {
	ListWorkersDto,
	RegisterWorkerDto,
	UpdateOwnWorkerProfileDto,
	UpdateWorkerDto,
} from "../../application/dto/worker.dto";
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
		const result =
			session.kind === "staff"
				? await this.service.listForSession(session, scopedFilter)
				: await this.service.list(scopedFilter);
		if (session.kind === "staff") {
			return result;
		}
		return { ...result, data: result.data.map(toCustomerWorker) };
	}

	@Get("me")
	@ApiOperation({ summary: "Get the current worker's own profile" })
	async getMe(@Req() req: WezRequest) {
		const session = await requirePermission(req, "worker:read");
		const worker = await this.service.getOwnProfile(session.user.id);
		return { data: toSelfWorker(worker) };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a worker profile" })
	async getById(@Param("id") id: string, @Req() req: WezRequest) {
		const session = await requirePermission(req, "worker:read");
		const worker = await this.service.getByIdForSession(session, id);
		return { data: session.kind === "staff" ? worker : toCustomerWorker(worker) };
	}

	@Post()
	@AuditLog(AUDIT_ACTIONS.workerCreated, { mode: "auto", targetType: AUDIT_TARGET_TYPES.worker })
	@ApiOperation({ summary: "Register a worker (agent / staff only, in-station)" })
	@ApiBody({ type: RegisterWorkerDto })
	async register(@Body() dto: RegisterWorkerDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "worker:create");
		return { data: await this.service.register(s, dto) };
	}

	@Patch("me")
	@AuditLog(AUDIT_ACTIONS.workerProfileUpdated)
	@ApiOperation({ summary: "Update the current worker's own editable profile fields" })
	@ApiBody({ type: UpdateOwnWorkerProfileDto })
	async updateMe(@Body() dto: UpdateOwnWorkerProfileDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "worker:update");
		return { data: toSelfWorker(await this.service.updateOwnProfile(session, dto, req.auditContext)) };
	}

	@Patch(":id")
	@AuditLog(AUDIT_ACTIONS.workerProfileUpdated)
	@ApiOperation({ summary: "Update a worker" })
	@ApiBody({ type: UpdateWorkerDto })
	async update(@Param("id") id: string, @Body() dto: UpdateWorkerDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "worker:update");
		const worker = await this.service.updateForSession(session, id, dto, req.auditContext);
		return { data: session.kind === "staff" ? worker : toSelfWorker(worker) };
	}
}

const toCustomerWorker = (worker: Worker): Worker => ({
	...worker,
	fayda: "",
	phone: "",
});

const toSelfWorker = (worker: Worker): Worker => worker;
