import { Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { StationsService } from "./application/services/stations.service";
import { STATIONS_REPO } from "./domain/repositories/stations.repository";
import { PrismaStationsRepository } from "./infrastructure/repositories/prisma-stations.repository";
import { StationsController, StationsPublicController } from "./presentation/controllers/stations.controller";

@Module({
	imports: [AdminModule],
	controllers: [StationsController, StationsPublicController],
	providers: [StationsService, { provide: STATIONS_REPO, useClass: PrismaStationsRepository }],
	exports: [StationsService, { provide: STATIONS_REPO, useClass: PrismaStationsRepository }],
})
export class StationsModule {}
