import { Module } from "@nestjs/common";
import { AuditEventsService } from "./audit-events.service";
import { AuditLogController } from "./presentation/controllers/audit-log.controller";

@Module({
	controllers: [AuditLogController],
	providers: [AuditEventsService],
	exports: [AuditEventsService],
})
export class AuditLogModule {}
