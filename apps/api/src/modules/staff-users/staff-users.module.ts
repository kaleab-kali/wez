import { Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { StaffUsersService } from "./application/services/staff-users.service";
import { StaffUsersController } from "./presentation/controllers/staff-users.controller";

@Module({
	imports: [AdminModule],
	controllers: [StaffUsersController],
	providers: [StaffUsersService],
	exports: [StaffUsersService],
})
export class StaffUsersModule {}
