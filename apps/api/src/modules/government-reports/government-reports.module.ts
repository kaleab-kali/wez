import { Module } from "@nestjs/common";
import { GovernmentReportsService } from "./application/services/government-reports.service";
import { GOVERNMENT_REPORTS_REPOSITORY } from "./domain/repositories/government-reports.repository";
import { PrismaGovernmentReportsRepository } from "./infrastructure/repositories/prisma-government-reports.repository";
import { GovernmentReportsController } from "./presentation/controllers/government-reports.controller";

@Module({
	controllers: [GovernmentReportsController],
	providers: [
		GovernmentReportsService,
		{ provide: GOVERNMENT_REPORTS_REPOSITORY, useClass: PrismaGovernmentReportsRepository },
	],
})
export class GovernmentReportsModule {}
