import { Body, Controller, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "#modules/auth/auth.config";
import { hasPermission, type Permission } from "#modules/auth/permissions";
import { CreateJobDto, ListJobsDto, UpdateJobDto } from "../../application/dto/job.dto";
import { JobsService } from "../../application/services/jobs.service";

const requireSession = async (req: any, permission?: Permission) => {
	const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
	if (!session?.user) throw new UnauthorizedException();
	const role = (session.user as { role?: string }).role;
	if (permission && !hasPermission(role, permission)) {
		throw new UnauthorizedException({ code: "MISSING_PERMISSION", message: permission });
	}
	return { session, role };
};

@ApiTags("Jobs")
@ApiBearerAuth()
@Controller("jobs")
export class JobsController {
	constructor(private readonly service: JobsService) {}

	@Get()
	@ApiOperation({ summary: "List jobs (workers see open jobs, agents see all)" })
	async list(@Query() filter: ListJobsDto, @Req() req: any) {
		const { role } = await requireSession(req, "job:list");
		// Workers default to open-only
		if (role === "worker" && !filter.status) filter.status = "open";
		return this.service.list(filter);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get a job by id" })
	async getById(@Param("id") id: string, @Req() req: any) {
		await requireSession(req, "job:read");
		return { data: await this.service.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a job" })
	@ApiBody({ type: CreateJobDto })
	async create(@Body() dto: CreateJobDto, @Req() req: any) {
		const { session, role } = await requireSession(req, "job:create");
		const isAgent = role === "agent" || role === "station_supervisor";
		return { data: await this.service.create(session.user.id, dto, isAgent) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a job" })
	@ApiBody({ type: UpdateJobDto })
	async update(@Param("id") id: string, @Body() dto: UpdateJobDto, @Req() req: any) {
		await requireSession(req, "job:update");
		return { data: await this.service.update(id, dto) };
	}

	@Post(":id/close")
	@ApiOperation({ summary: "Close a job" })
	async close(@Param("id") id: string, @Req() req: any) {
		await requireSession(req, "job:close");
		return { data: await this.service.close(id) };
	}
}
