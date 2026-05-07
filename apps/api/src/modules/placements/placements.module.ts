import { Module } from "@nestjs/common";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { JobsModule } from "#modules/jobs/jobs.module";
import { AgreementPdfService } from "./application/services/agreement-pdf.service";
import { PlacementsService } from "./application/services/placements.service";
import { PlacementsController } from "./presentation/controllers/placements.controller";

@Module({
	imports: [AuditLogModule, JobsModule],
	controllers: [PlacementsController],
	providers: [AgreementPdfService, PlacementsService],
	exports: [PlacementsService],
})
export class PlacementsModule {}
