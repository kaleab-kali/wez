import { Body, Controller, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "#modules/auth/auth.config";
import { hasPermission, type Permission } from "#modules/auth/permissions";
import {
	ListWorkersDto,
	RegisterWorkerDto,
	UpdateWorkerDto,
} from "../../application/dto/worker.dto";
import { WorkersService } from "../../application/services/workers.service";

const requirePermission = async (req: any, permission: Permission) => {
	const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
	if (!session?.user) throw new UnauthorizedException();
	const role = (session.user as { role?: string }).role;
	if (!hasPermission(role, permission)) {
		throw new UnauthorizedException({ code: "MISSING_PERMISSION", message: permission });
	}
	return session;
};

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
	@ApiOperation({ summary: "Register a worker (agent only, in-station)" })
	@ApiBody({ type: RegisterWorkerDto })
	async register(@Body() dto: RegisterWorkerDto, @Req() req: any) {
		const session = await requirePermission(req, "worker:create");
		return { data: await this.service.register(session.user.id, dto) };
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update a worker" })
	@ApiBody({ type: UpdateWorkerDto })
	async update(@Param("id") id: string, @Body() dto: UpdateWorkerDto, @Req() req: any) {
		await requirePermission(req, "worker:update");
		return { data: await this.service.update(id, dto) };
	}
}
