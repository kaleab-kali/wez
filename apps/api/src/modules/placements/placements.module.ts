import { Module } from "@nestjs/common";
import { AgreementPdfService } from "./application/services/agreement-pdf.service";
import { PlacementsService } from "./application/services/placements.service";
import { PlacementsController } from "./presentation/controllers/placements.controller";

@Module({
	controllers: [PlacementsController],
	providers: [AgreementPdfService, PlacementsService],
	exports: [PlacementsService],
})
export class PlacementsModule {}
