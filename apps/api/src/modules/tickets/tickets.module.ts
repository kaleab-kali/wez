import { Module } from "@nestjs/common";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { TicketsService } from "./application/services/tickets.service";
import { TICKETS_REPO } from "./domain/repositories/tickets.repository";
import { PrismaTicketsRepository } from "./infrastructure/repositories/prisma-tickets.repository";
import { TicketsController } from "./presentation/controllers/tickets.controller";

@Module({
	imports: [AuditLogModule, NotificationModule],
	controllers: [TicketsController],
	providers: [TicketsService, StaffAccessService, { provide: TICKETS_REPO, useClass: PrismaTicketsRepository }],
	exports: [TicketsService],
})
export class TicketsModule {}
