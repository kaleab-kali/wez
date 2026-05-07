import { Module } from "@nestjs/common";
import { EmployersModule } from "#modules/employers/employers.module";
import { HireRequestsModule } from "#modules/hire-requests/hire-requests.module";
import { JobsModule } from "#modules/jobs/jobs.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { WorkersModule } from "#modules/workers/workers.module";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { ReferralExpiryService } from "./application/services/referral-expiry.service";
import { ReferralsService } from "./application/services/referrals.service";
import { REFERRALS_REPO } from "./domain/repositories/referrals.repository";
import { PrismaReferralsRepository } from "./infrastructure/repositories/prisma-referrals.repository";
import { ReferralsController } from "./presentation/controllers/referrals.controller";

@Module({
	imports: [WorkersModule, EmployersModule, JobsModule, HireRequestsModule, NotificationModule],
	controllers: [ReferralsController],
	providers: [
		ReferralsService,
		ReferralExpiryService,
		StaffAccessService,
		{ provide: REFERRALS_REPO, useClass: PrismaReferralsRepository },
	],
	exports: [ReferralsService],
})
export class ReferralsModule {}
