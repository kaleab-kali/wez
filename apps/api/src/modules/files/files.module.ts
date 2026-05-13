import { Module } from "@nestjs/common";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { PrismaModule } from "#shared/database/prisma.module";
import { StorageModule } from "#shared/storage/storage.module";
import { FileRetentionService } from "./application/services/file-retention.service";
import { FilesService } from "./application/services/files.service";
import { VirusScanService } from "./application/services/virus-scan.service";
import { FilesController } from "./presentation/controllers/files.controller";

@Module({
	imports: [PrismaModule, StorageModule],
	controllers: [FilesController],
	providers: [FilesService, StaffAccessService, VirusScanService, FileRetentionService],
	exports: [FilesService],
})
export class FilesModule {}
