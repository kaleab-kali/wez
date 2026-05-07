import { Controller, Get, Header, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
	@ApiResponse({ status: 200, description: "Audit events returned" })
	async list(@Query() filter: ListAuditEventsDto, @Req() req: WezRequest) {
		await requirePermission(req, "audit:read");
		return this.auditEvents.list(filter);
	}

	@Get("export")
	@Header("Content-Type", "text/csv; charset=utf-8")
	@Header("Content-Disposition", 'attachment; filename="audit-events.csv"')
	@ApiOperation({ summary: "Export audit events as CSV" })
	@ApiResponse({ status: 200, description: "CSV export returned" })
	async export(@Query() filter: ListAuditEventsDto, @Req() req: WezRequest) {
		await requirePermission(req, "audit:export");
		return this.auditEvents.exportCsv(filter);
	}
}
