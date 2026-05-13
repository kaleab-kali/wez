import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FilesService } from "./files.service";

@Injectable()
export class FileRetentionService {
	private readonly logger = new Logger(FileRetentionService.name);

	constructor(private readonly files: FilesService) {}

	@Cron(CronExpression.EVERY_DAY_AT_2AM)
	async cleanupExpiredTempUploads(): Promise<void> {
		const result = await this.files.cleanupExpiredTempUploads();
		if (result.deleted > 0) this.logger.log(`Deleted ${result.deleted} expired temporary uploads`);
	}
}
