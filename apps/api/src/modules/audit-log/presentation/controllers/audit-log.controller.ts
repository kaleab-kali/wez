import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { ListAuditEventsDto } from "../../application/dto/list-audit-events.dto";
import { AuditEventsService } from "../../audit-events.service";

@ApiTags("Audit Events")
@ApiBearerAuth()
@Controller("audit-events")
export class AuditLogController {
	constructor(private readonly auditEvents: AuditEventsService) {}

	@Get()
	@ApiOperation({ summary: "List audit events with compliance filters" })
	async list(@Query() filter: ListAuditEventsDto, @Req() req: WezRequest) {
		await requirePermission(req, "audit:read");
		return this.auditEvents.list(filter);
	}
}
