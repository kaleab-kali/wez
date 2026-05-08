import { Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { StationsService } from "./application/services/stations.service";
import { STATIONS_REPO } from "./domain/repositories/stations.repository";
import { PrismaStationsRepository } from "./infrastructure/repositories/prisma-stations.repository";
import { StationsController, StationsPublicController } from "./presentation/controllers/stations.controller";

@Module({
	imports: [AdminModule, AuditLogModule],
	controllers: [StationsController, StationsPublicController],
	providers: [StationsService, StaffAccessService, { provide: STATIONS_REPO, useClass: PrismaStationsRepository }],
	exports: [StationsService, { provide: STATIONS_REPO, useClass: PrismaStationsRepository }],
})
export class StationsModule {}
