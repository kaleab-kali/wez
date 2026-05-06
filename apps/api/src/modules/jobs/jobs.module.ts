import { Module } from "@nestjs/common";
import { EmployersModule } from "#modules/employers/employers.module";
import { RoleCatalogModule } from "#modules/role-catalog/role-catalog.module";
import { JobsService } from "./application/services/jobs.service";
import { JOBS_REPO } from "./domain/repositories/jobs.repository";
import { PrismaJobsRepository } from "./infrastructure/repositories/prisma-jobs.repository";
import { JobsController } from "./presentation/controllers/jobs.controller";

@Module({
	imports: [EmployersModule, RoleCatalogModule],
	controllers: [JobsController],
	providers: [JobsService, { provide: JOBS_REPO, useClass: PrismaJobsRepository }],
	exports: [JobsService],
})
export class JobsModule {}
