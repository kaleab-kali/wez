import { Module } from "@nestjs/common";
import { AdminDashboardService } from "./application/services/admin-dashboard.service";
import { AdminPermissionsGuard } from "./guards/admin-permissions.guard";
import { SuperAdminGuard } from "./guards/super-admin.guard";
import { AdminAuthController } from "./presentation/controllers/admin-auth.controller";
import { AdminDashboardController } from "./presentation/controllers/admin-dashboard.controller";

@Module({
	controllers: [AdminAuthController, AdminDashboardController],
	providers: [SuperAdminGuard, AdminPermissionsGuard, AdminDashboardService],
	exports: [AdminPermissionsGuard],
})
export class AdminModule {}
