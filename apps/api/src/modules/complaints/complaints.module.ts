import { Module } from "@nestjs/common";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { EmployersModule } from "#modules/employers/employers.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { WorkersModule } from "#modules/workers/workers.module";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { ComplaintsService } from "./application/services/complaints.service";
import { COMPLAINTS_REPO } from "./domain/repositories/complaints.repository";
import { PrismaComplaintsRepository } from "./infrastructure/repositories/prisma-complaints.repository";
import { ComplaintsController } from "./presentation/controllers/complaints.controller";

@Module({
	imports: [AuditLogModule, EmployersModule, NotificationModule, WorkersModule],
	controllers: [ComplaintsController],
	providers: [
		ComplaintsService,
		StaffAccessService,
		{ provide: COMPLAINTS_REPO, useClass: PrismaComplaintsRepository },
	],
	exports: [ComplaintsService],
})
export class ComplaintsModule {}
