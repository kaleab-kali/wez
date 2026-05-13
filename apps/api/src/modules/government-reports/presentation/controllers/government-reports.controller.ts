import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import {
	GenerateGovernmentReportDto,
	GovernmentReportPeriodDto,
	ListGovernmentReportsDto,
	MarkGovernmentReportFiledDto,
} from "../../application/dto/government-report.dto";
import { GovernmentReportsService } from "../../application/services/government-reports.service";

@ApiTags("Government Reports")
@ApiBearerAuth()
@Controller("government-reports")
export class GovernmentReportsController {
	constructor(private readonly service: GovernmentReportsService) {}

	@Get()
	@ApiOperation({ summary: "List generated government reports" })
	@ApiResponse({ status: 200, description: "Government reports returned" })
	async list(@Query() filter: ListGovernmentReportsDto, @Req() req: WezRequest) {
		await requirePermission(req, "report:read");
		return this.service.list(filter);
	}

	@Get("summary")
	@ApiOperation({ summary: "Preview government reporting metrics for a period" })
	@ApiResponse({ status: 200, description: "Government report summary returned" })
	async summary(@Query() filter: GovernmentReportPeriodDto, @Req() req: WezRequest) {
		await requirePermission(req, "report:read");
		return { data: await this.service.summary(filter) };
	}

	@Post("generate")
	@AuditLog(AUDIT_ACTIONS.governmentReportGenerated, {
		mode: "auto",
		targetType: AUDIT_TARGET_TYPES.governmentReport,
	})
	@ApiOperation({ summary: "Generate a manual government report export" })
	@ApiBody({ type: GenerateGovernmentReportDto })
	@ApiResponse({ status: 201, description: "Government report generated" })
	async generate(@Body() dto: GenerateGovernmentReportDto, @Req() req: WezRequest) {
		const session = await requirePermission(req, "report:export");
		return { data: await this.service.generate(session, dto) };
	}

	@Post(":id/filed")
	@HttpCode(HttpStatus.OK)
	@AuditLog(AUDIT_ACTIONS.governmentReportFiled, {
		mode: "auto",
		targetIdParam: "id",
		targetType: AUDIT_TARGET_TYPES.governmentReport,
	})
	@ApiOperation({ summary: "Record manual filing reference for a ready government report" })
	@ApiBody({ type: MarkGovernmentReportFiledDto })
	@ApiResponse({ status: 200, description: "Government report marked filed" })
	async markFiled(@Param("id") id: string, @Body() dto: MarkGovernmentReportFiledDto, @Req() req: WezRequest) {
		await requirePermission(req, "report:file");
		return { data: await this.service.markFiled(id, dto) };
	}
}
