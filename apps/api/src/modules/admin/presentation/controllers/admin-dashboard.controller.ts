import { Controller, Get, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { requirePermission, type WezRequest } from "#shared/auth/session";
import { AdminDashboardService } from "../../application/services/admin-dashboard.service";

@ApiTags("Admin Dashboard")
@ApiBearerAuth()
@Controller("admin/dashboard")
export class AdminDashboardController {
	constructor(private readonly dashboard: AdminDashboardService) {}

	@Get("metrics")
	@ApiOperation({ summary: "Return HQ dashboard operational metrics" })
	@ApiResponse({ status: 200, description: "Dashboard metrics returned" })
	async metrics(@Req() req: WezRequest) {
		await requirePermission(req, "dashboard:read");
		return this.dashboard.getMetrics();
	}
}
