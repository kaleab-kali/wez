import { Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { StaffUsersService } from "./application/services/staff-users.service";
import { StaffAccessReviewController } from "./presentation/controllers/staff-access-review.controller";
import { StaffOrgChartController } from "./presentation/controllers/staff-org-chart.controller";
import { StaffUsersController } from "./presentation/controllers/staff-users.controller";

@Module({
	imports: [AdminModule, AuditLogModule],
	controllers: [StaffUsersController, StaffAccessReviewController, StaffOrgChartController],
	providers: [StaffUsersService],
	exports: [StaffUsersService],
})
export class StaffUsersModule {}
