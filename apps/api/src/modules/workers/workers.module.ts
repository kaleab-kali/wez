import { Module } from "@nestjs/common";
import { RoleCatalogModule } from "#modules/role-catalog/role-catalog.module";
import { StationsModule } from "#modules/stations/stations.module";
import { WorkersService } from "./application/services/workers.service";
import { WORKERS_REPO } from "./domain/repositories/workers.repository";
import { PrismaWorkersRepository } from "./infrastructure/repositories/prisma-workers.repository";
import { WorkersController } from "./presentation/controllers/workers.controller";

@Module({
	imports: [RoleCatalogModule, StationsModule],
	controllers: [WorkersController],
	providers: [
		WorkersService,
		{ provide: WORKERS_REPO, useClass: PrismaWorkersRepository },
	],
	exports: [WorkersService, { provide: WORKERS_REPO, useClass: PrismaWorkersRepository }],
})
export class WorkersModule {}
