import { Module } from "@nestjs/common";
import { EmployersModule } from "#modules/employers/employers.module";
import { PlatformSettingsModule } from "#modules/platform-settings/platform-settings.module";
import { RoleCatalogModule } from "#modules/role-catalog/role-catalog.module";
import { StationsModule } from "#modules/stations/stations.module";
import { WorkersModule } from "#modules/workers/workers.module";
import { HireRequestExpiryService } from "./application/services/hire-request-expiry.service";
import { HireRequestsService } from "./application/services/hire-requests.service";
import { HIRE_REQUESTS_REPO } from "./domain/repositories/hire-requests.repository";
import { PrismaHireRequestsRepository } from "./infrastructure/repositories/prisma-hire-requests.repository";
import { HireRequestsController } from "./presentation/controllers/hire-requests.controller";

@Module({
	imports: [WorkersModule, EmployersModule, RoleCatalogModule, StationsModule, PlatformSettingsModule],
	controllers: [HireRequestsController],
	providers: [
		HireRequestsService,
		HireRequestExpiryService,
		{ provide: HIRE_REQUESTS_REPO, useClass: PrismaHireRequestsRepository },
	],
	exports: [HireRequestsService],
})
export class HireRequestsModule {}
