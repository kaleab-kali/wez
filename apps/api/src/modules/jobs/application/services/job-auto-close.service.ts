import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { JobsService } from "./jobs.service";

@Injectable()
export class JobAutoCloseService {
	private readonly logger = new Logger(JobAutoCloseService.name);

	constructor(private readonly jobs: JobsService) {}

	@Cron(CronExpression.EVERY_DAY_AT_1AM)
	async closeStaleJobs() {
		const result = await this.jobs.closeStaleOpenJobs();
		if (result.closed > 0) {
			this.logger.log(`Closed ${result.closed} stale job posts`);
		}
	}
}
