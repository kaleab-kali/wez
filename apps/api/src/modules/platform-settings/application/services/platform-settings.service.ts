import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

const HIRE_REQUEST_EXPIRY_DAYS_KEY = "hiring.hireRequestExpiryDays";
const DEFAULT_HIRE_REQUEST_EXPIRY_DAYS = 1;

@Injectable()
export class PlatformSettingsService {
	constructor(private readonly prisma: PrismaService) {}

	async getHiringPolicy() {
		return {
			hireRequestExpiryDays: await this.getPositiveInt(HIRE_REQUEST_EXPIRY_DAYS_KEY, DEFAULT_HIRE_REQUEST_EXPIRY_DAYS),
		};
	}

	async updateHiringPolicy(input: { hireRequestExpiryDays: number }) {
		const value = String(input.hireRequestExpiryDays);
		await this.prisma.platformSettings.upsert({
			where: { key: HIRE_REQUEST_EXPIRY_DAYS_KEY },
			update: { value },
			create: { key: HIRE_REQUEST_EXPIRY_DAYS_KEY, value },
		});
		return this.getHiringPolicy();
	}

	private async getPositiveInt(key: string, fallback: number) {
		const row = await this.prisma.platformSettings.findUnique({ where: { key } });
		const parsed = Number(row?.value);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
	}
}
