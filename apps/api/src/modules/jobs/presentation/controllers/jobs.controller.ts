import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { CreateJobDto, ListJobsDto, UpdateJobDto } from "../../application/dto/job.dto";
import { JobsService } from "../../application/services/jobs.service";

@ApiTags("Jobs")
@ApiBearerAuth()
@Controller("jobs")
export class JobsController {
	constructor(private readonly service: JobsService) {}

	@Get()
	@ApiOperation({ summary: "List jobs (workers see open jobs, staff see all)" })
	@ApiResponse({ status: 200, description: "Jobs returned" })
	async list(@Query() filter: ListJobsDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "job:list");
		return this.service.listForSession(s, filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a job by id" })
	@ApiResponse({ status: 200, description: "Job returned" })
	async getById(@Param("id") id: string, @Req() req: WezRequest) {
		const s = await requirePermission(req, "job:read");
		return { data: await this.service.getByIdForSession(s, id) };
	}

	@Post()
	@AuditLog(AUDIT_ACTIONS.jobCreated)
	@ApiOperation({ summary: "Create a job" })
	@ApiBody({ type: CreateJobDto })
	@ApiResponse({ status: 201, description: "Job created" })
	async create(@Body() dto: CreateJobDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "job:create");
		return { data: await this.service.create(s, dto, req.auditContext) };
	}

	@Patch(":id")
	@AuditLog(AUDIT_ACTIONS.jobUpdated)
	@ApiOperation({ summary: "Update a job" })
	@ApiBody({ type: UpdateJobDto })
	@ApiResponse({ status: 200, description: "Job updated" })
	async update(@Param("id") id: string, @Body() dto: UpdateJobDto, @Req() req: WezRequest) {
		const s = await requirePermission(req, "job:update");
		return { data: await this.service.updateForSession(s, id, dto, req.auditContext) };
	}

	@Post(":id/close")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.jobClosed)
	@ApiOperation({ summary: "Close a job" })
	@ApiResponse({ status: 200, description: "Job closed" })
	async close(@Param("id") id: string, @Req() req: WezRequest) {
		const s = await requirePermission(req, "job:close");
		return { data: await this.service.closeForSession(s, id, req.auditContext) };
	}
}
