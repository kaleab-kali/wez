import { Module } from "@nestjs/common";
import { AdminPermissionsGuard } from "./guards/admin-permissions.guard";
import { SuperAdminGuard } from "./guards/super-admin.guard";
import { AdminAuthController } from "./presentation/controllers/admin-auth.controller";

@Module({
	controllers: [AdminAuthController],
	providers: [SuperAdminGuard, AdminPermissionsGuard],
	exports: [AdminPermissionsGuard],
})
export class AdminModule {}
