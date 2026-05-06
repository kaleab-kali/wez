import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { requirePermission } from "#shared/auth/session";
import { CreateJobDto, ListJobsDto, UpdateJobDto } from "../../application/dto/job.dto";
import { JobsService } from "../../application/services/jobs.service";

@ApiTags("Jobs")
@ApiBearerAuth()
@Controller("jobs")
export class JobsController {
	constructor(private readonly service: JobsService) {}

	@Get()
	@ApiOperation({ summary: "List jobs (workers see open jobs, staff see all)" })
	async list(@Query() filter: ListJobsDto, @Req() req: any) {
		const s = await requirePermission(req, "job:list");
		// Workers default to open-only
		if (s.user.role === "worker" && !filter.status) filter.status = "open";
		return this.service.list(filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a job by id" })
	async getById(@Param("id") id: string, @Req() req: any) {
		await requirePermission(req, "job:read");
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a job" })
	@ApiBody({ type: CreateJobDto })
	async create(@Body() dto: CreateJobDto, @Req() req: any) {
		const s = await requirePermission(req, "job:create");
		const isStaff = s.kind === "staff";
		return { data: await this.service.create(s.user.id, dto, isStaff) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a job" })
	@ApiBody({ type: UpdateJobDto })
	async update(@Param("id") id: string, @Body() dto: UpdateJobDto, @Req() req: any) {
		await requirePermission(req, "job:update");
		return { data: await this.service.update(id, dto) };
	}

	@Post(":id/close")
	@ApiOperation({ summary: "Close a job" })
	async close(@Param("id") id: string, @Req() req: any) {
		await requirePermission(req, "job:close");
		return { data: await this.service.close(id) };
	}
}
