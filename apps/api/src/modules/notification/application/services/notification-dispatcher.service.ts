import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "#shared/database/prisma.service";
import { EmailService } from "#shared/email/email.service";
import { isNotificationChannel } from "../../domain/entities/notification.entity";
import { NotificationTemplateService } from "./notification-template.service";

const DISPATCH_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [60_000, 5 * 60_000, 15 * 60_000] as const;
const STUB_MESSAGE_ID_PREFIX = "disabled";

type DeliverableNotification = {
	readonly id: string;
	readonly userId: string | null;
	readonly adminUserId: string | null;
	readonly recipientPhone: string | null;
	readonly recipientEmail: string | null;
	readonly channel: string;
	readonly templateKey: string;
	readonly payload: unknown;
	readonly subject: string | null;
	readonly body: string | null;
	readonly attempts: number;
};

const payloadRecord = (payload: unknown): Record<string, string> => {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
	return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]));
};

const shortFailure = (error: unknown): string => {
	if (error instanceof Error) return error.message.slice(0, 500);
	return String(error).slice(0, 500);
};

@Injectable()
export class NotificationDispatcherService {
	private readonly logger = new Logger(NotificationDispatcherService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly templates: NotificationTemplateService,
		private readonly email: EmailService,
	) {}

	@Interval(DISPATCH_INTERVAL_MS)
	async processScheduledBatch(): Promise<void> {
		await this.processPending(DEFAULT_BATCH_SIZE);
	}

	async processPending(limit = DEFAULT_BATCH_SIZE): Promise<{ processed: number }> {
		const now = new Date();
		const rows = await this.prisma.notification.findMany({
			where: {
				channel: { in: ["sms", "email"] },
				status: { in: ["pending", "retry"] },
				attempts: { lt: MAX_ATTEMPTS },
				OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
			},
			orderBy: [{ createdAt: "asc" }],
			take: limit,
			select: {
				id: true,
				userId: true,
				adminUserId: true,
				recipientPhone: true,
				recipientEmail: true,
				channel: true,
				templateKey: true,
				payload: true,
				subject: true,
				body: true,
				attempts: true,
			},
		});

		for (const row of rows) {
			await this.processOne(row);
		}

		return { processed: rows.length };
	}

	private async processOne(row: DeliverableNotification): Promise<void> {
		if (!isNotificationChannel(row.channel) || row.channel === "in_app") return;
		const claim = await this.prisma.notification.updateMany({
			where: {
				id: row.id,
				attempts: row.attempts,
				status: { in: ["pending", "retry"] },
			},
			data: {
				attempts: { increment: 1 },
				lastAttemptAt: new Date(),
				status: "retry",
				failedReason: null,
			},
		});
		if (claim.count !== 1) return;

		const attemptNumber = row.attempts + 1;
		try {
			const rendered = row.body
				? { subject: row.subject, body: row.body }
				: await this.templates.render({
						templateKey: row.templateKey,
						channel: row.channel,
						payload: payloadRecord(row.payload),
						locale: await this.localeFor(row),
					});

			await this.deliver(row, rendered.subject, rendered.body);
			await this.prisma.notification.update({
				where: { id: row.id },
				data: {
					status: "sent",
					subject: rendered.subject,
					body: rendered.body,
					sentAt: new Date(),
					nextAttemptAt: null,
					failedReason: null,
				},
			});
		} catch (error) {
			const exhausted = attemptNumber >= MAX_ATTEMPTS;
			await this.prisma.notification.update({
				where: { id: row.id },
				data: {
					status: exhausted ? "failed" : "retry",
					failedReason: shortFailure(error),
					nextAttemptAt: exhausted ? null : new Date(Date.now() + RETRY_DELAY_MS[attemptNumber - 1]),
				},
			});
			this.logger.warn(`Notification ${row.id} ${exhausted ? "failed" : "will retry"}: ${shortFailure(error)}`);
		}
	}

	private async deliver(row: DeliverableNotification, subject: string | null, body: string): Promise<void> {
		if (row.channel === "sms") {
			await this.deliverSms(row, body);
			return;
		}
		if (row.channel === "email") {
			await this.deliverEmail(row, subject, body);
		}
	}

	private async deliverSms(row: DeliverableNotification, body: string): Promise<void> {
		const provider = process.env.SMS_PROVIDER ?? "disabled";
		if (!row.recipientPhone) throw new Error("SMS recipient phone missing");
		if (provider !== "disabled") {
			throw new Error(`SMS provider ${provider} is not enabled in this build`);
		}
		this.logger.log(`${STUB_MESSAGE_ID_PREFIX}:sms would send to ${row.recipientPhone}: ${body}`);
	}

	private async deliverEmail(row: DeliverableNotification, subject: string | null, body: string): Promise<void> {
		const provider = process.env.EMAIL_PROVIDER ?? "disabled";
		if (!row.recipientEmail) throw new Error("Email recipient missing");
		if (provider === "disabled") {
			this.logger.log(`${STUB_MESSAGE_ID_PREFIX}:email would send to ${row.recipientEmail}: ${subject ?? body}`);
			return;
		}
		if (provider === "smtp") {
			await this.email.send({ to: row.recipientEmail, subject: subject ?? "Wez notification", text: body });
			return;
		}
		throw new Error(`Email provider ${provider} is not enabled in this build`);
	}

	private async localeFor(row: DeliverableNotification): Promise<string> {
		if (row.userId) {
			const user = await this.prisma.user.findUnique({ where: { id: row.userId }, select: { localePref: true } });
			return user?.localePref ?? "en";
		}
		return "en";
	}
}
