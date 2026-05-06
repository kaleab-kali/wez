import { Module } from "@nestjs/common";
import { AuditEventsService } from "./audit-events.service";

@Module({
	providers: [AuditEventsService],
	exports: [AuditEventsService],
})
export class AuditLogModule {}
