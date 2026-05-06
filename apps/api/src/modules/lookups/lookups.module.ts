import { Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { LookupsService } from "./application/services/lookups.service";
import { LOOKUPS_REPO } from "./domain/repositories/lookups.repository";
import { PrismaLookupsRepository } from "./infrastructure/repositories/prisma-lookups.repository";
import { LookupsAdminController, LookupsPublicController } from "./presentation/controllers/lookups.controller";

@Module({
	imports: [AdminModule],
	controllers: [LookupsAdminController, LookupsPublicController],
	providers: [LookupsService, { provide: LOOKUPS_REPO, useClass: PrismaLookupsRepository }],
	exports: [LookupsService, { provide: LOOKUPS_REPO, useClass: PrismaLookupsRepository }],
})
export class LookupsModule {}
