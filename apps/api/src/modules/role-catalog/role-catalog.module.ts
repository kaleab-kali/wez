import { Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { RoleCatalogService } from "./application/services/role-catalog.service";
import { ROLE_CATALOG_REPO } from "./domain/repositories/role-catalog.repository";
import { PrismaRoleCatalogRepository } from "./infrastructure/repositories/prisma-role-catalog.repository";
import {
	RoleCatalogAdminController,
	RoleCatalogPublicController,
} from "./presentation/controllers/role-catalog.controller";

@Module({
	imports: [AdminModule],
	controllers: [RoleCatalogAdminController, RoleCatalogPublicController],
	providers: [
		RoleCatalogService,
		{ provide: ROLE_CATALOG_REPO, useClass: PrismaRoleCatalogRepository },
	],
	exports: [RoleCatalogService, { provide: ROLE_CATALOG_REPO, useClass: PrismaRoleCatalogRepository }],
})
export class RoleCatalogModule {}
