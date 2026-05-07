import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HireRequestsService } from "./hire-requests.service";

// Per modules.md 6.5.1 — hourly background job to expire awaiting_visit > 5d.
@Injectable()
export class HireRequestExpiryService {
	private readonly logger = new Logger(HireRequestExpiryService.name);

	constructor(private readonly service: HireRequestsService) {}

	@Cron(CronExpression.EVERY_HOUR)
	async tick() {
		try {
			const result = await this.service.expireDue();
			if (result.expired > 0) {
				this.logger.log(`Expired ${result.expired} hire requests`);
			}
		} catch (err) {
			this.logger.error("Hire request expiry job failed", err);
		}
	}
}
