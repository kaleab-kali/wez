import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ReferralsService } from "./referrals.service";

@Injectable()
export class ReferralExpiryService {
	private readonly logger = new Logger(ReferralExpiryService.name);

	constructor(private readonly service: ReferralsService) {}

	@Cron(CronExpression.EVERY_HOUR)
	async tick() {
		const result = await this.service.expireDue();
		if (result.expired > 0) {
			this.logger.log(`Expired ${result.expired} referrals`);
		}
	}
}
