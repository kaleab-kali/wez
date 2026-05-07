import { Module } from "@nestjs/common";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { JobsModule } from "#modules/jobs/jobs.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { AgreementPdfService } from "./application/services/agreement-pdf.service";
import { PlacementNotificationsService } from "./application/services/placement-notifications.service";
import { PlacementsService } from "./application/services/placements.service";
import { PlacementsController } from "./presentation/controllers/placements.controller";

@Module({
	imports: [AuditLogModule, JobsModule, NotificationModule],
	controllers: [PlacementsController],
	providers: [AgreementPdfService, PlacementNotificationsService, PlacementsService],
	exports: [PlacementsService],
})
export class PlacementsModule {}
