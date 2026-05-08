import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminPermissionsGuard, RequireAdminRole } from "#modules/admin/guards/admin-permissions.guard";
import { StaffUsersService } from "../../application/services/staff-users.service";

@ApiTags("Staff access review")
@ApiBearerAuth()
@Controller("admin/access-review")
@UseGuards(AdminPermissionsGuard)
@RequireAdminRole("super_admin", "ops_manager", "hr_manager", "compliance_officer", "executive_viewer")
export class StaffAccessReviewController {
	constructor(private readonly service: StaffUsersService) {}

	@Get()
	@ApiOperation({ summary: "List current staff roles and operational scopes for access review" })
	@ApiResponse({ status: 200, description: "Access review rows returned" })
	async list() {
		const data = await this.service.listAccessReview();
		return { data, meta: { total: data.length } };
	}
}
