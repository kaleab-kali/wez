import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminRole } from "#modules/admin/guards/admin-permissions.guard";
import { StaffUsersService } from "../../application/services/staff-users.service";

@ApiTags("Staff org chart")
@ApiBearerAuth()
@Controller("admin/staff-org-chart")
@UseGuards(AdminPermissionsGuard)
@RequireAdminRole(
	"super_admin",
	"ops_manager",
	"compliance_officer",
	"hr_manager",
	"finance_manager",
	"it_manager",
	"training_manager",
	"executive_viewer",
)
export class StaffOrgChartController {
	constructor(private readonly service: StaffUsersService) {}

	@Get()
	@ApiOperation({ summary: "Read the HQ team org chart" })
	@ApiResponse({ status: 200, description: "Org chart returned" })
	async getOrgChart() {
		return { data: await this.service.orgChart() };
	}
}
