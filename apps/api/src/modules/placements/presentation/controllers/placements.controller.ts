import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { EndPlacementDto, FinalizePlacementDto, ListPlacementsDto } from "../../application/dto/placement.dto";
import { PlacementsService } from "../../application/services/placements.service";

@ApiTags("Placements")
@ApiBearerAuth()
@Controller("placements")
export class PlacementsController {
	constructor(private readonly service: PlacementsService) {}

	@Get()
	@ApiOperation({ summary: "List placements with salary, commission, and payment details" })
	@ApiResponse({ status: 200, description: "Placements returned" })
	async list(@Query() filter: ListPlacementsDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "placement:list");
		return this.service.listForSession(session, filter);
	}

	@Post("from-hire-request/:hireRequestId/finalize")
	@ApiOperation({ summary: "Finalize a placement from an awaiting hire request" })
	@ApiBody({ type: FinalizePlacementDto })
	@ApiResponse({ status: 201, description: "Placement finalized and agreement PDF generated" })
	async finalizeFromHireRequest(
		@Param("hireRequestId") hireRequestId: string,
		@Body() dto: FinalizePlacementDto,
		@Req() req: WezRequest,
	) {
		const session = await requirePermission(req, "placement:finalize");
		return {
			data: await this.service.finalizeFromHireRequest(hireRequestId, session, dto, req.auditContext),
		};
	}

	@Post(":id/end")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "End an active placement and restore worker availability" })
	@ApiBody({ type: EndPlacementDto })
	@ApiResponse({ status: 200, description: "Placement ended" })
	async end(@Param("id") id: string, @Body() dto: EndPlacementDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "placement:end");
		return { data: await this.service.end(id, session, dto, req.auditContext) };
	}
}
