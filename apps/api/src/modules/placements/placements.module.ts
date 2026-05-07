import { Module } from "@nestjs/common";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { JobsModule } from "#modules/jobs/jobs.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { AgreementPdfService } from "./application/services/agreement-pdf.service";
import { PlacementAgreementSnapshotService } from "./application/services/placement-agreement-snapshot.service";
import { PlacementFinalizationPolicyService } from "./application/services/placement-finalization-policy.service";
import { PlacementNotificationsService } from "./application/services/placement-notifications.service";
import { PlacementStationAccessService } from "./application/services/placement-station-access.service";
import { PlacementsService } from "./application/services/placements.service";
import { PlacementsRepository } from "./infrastructure/repositories/placements.repository";
import { PlacementsController } from "./presentation/controllers/placements.controller";

@Module({
	imports: [AuditLogModule, JobsModule, NotificationModule],
	controllers: [PlacementsController],
	providers: [
		AgreementPdfService,
		PlacementAgreementSnapshotService,
		PlacementFinalizationPolicyService,
		PlacementNotificationsService,
		PlacementStationAccessService,
		PlacementsRepository,
		PlacementsService,
	],
	exports: [PlacementsService],
})
export class PlacementsModule {}
