import { Body, Controller, Get, Patch, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditLog } from "#shared/audit/audit-log.decorator";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { UpdateHiringPolicyDto } from "../../application/dto/platform-settings.dto";
import { PlatformSettingsService } from "../../application/services/platform-settings.service";

@ApiTags("Platform Settings")
@ApiBearerAuth()
@Controller("platform-settings")
export class PlatformSettingsController {
	constructor(private readonly service: PlatformSettingsService) {}

	@Get("hiring-policy")
	@ApiOperation({ summary: "Get configurable hiring workflow policy" })
	async getHiringPolicy(@Req() req: WezRequest) {
		await requirePermission(req, "platform_settings:read");
		return { data: await this.service.getHiringPolicy() };
	}

	@Patch("hiring-policy")
	@AuditLog(AUDIT_ACTIONS.hiringPolicyUpdated, { mode: "auto", targetType: AUDIT_TARGET_TYPES.hiringPolicy })
	@ApiOperation({ summary: "Update configurable hiring workflow policy" })
	@ApiBody({ type: UpdateHiringPolicyDto })
	async updateHiringPolicy(@Body() dto: UpdateHiringPolicyDto, @Req() req: WezRequest) {
		await requirePermission(req, "platform_settings:update");
		return { data: await this.service.updateHiringPolicy(dto) };
	}
}
