import { Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { LocationsService } from "./application/services/locations.service";
import { LocationsAdminController, LocationsPublicController } from "./presentation/controllers/locations.controller";

@Module({
	imports: [AdminModule],
	controllers: [LocationsAdminController, LocationsPublicController],
	providers: [LocationsService],
	exports: [LocationsService],
})
export class LocationsModule {}
