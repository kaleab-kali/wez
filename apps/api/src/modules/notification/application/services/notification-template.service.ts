import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { NotificationChannel } from "../../domain/entities/notification.entity";

type RenderedNotification = {
	readonly subject: string | null;
	readonly body: string;
};

const DEFAULT_LOCALE = "en";
const TEMPLATE_VARIABLE_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

const payloadValue = (payload: Record<string, string>, key: string): string => payload[key] ?? "";

const renderText = (template: string, payload: Record<string, string>): string =>
	template.replace(TEMPLATE_VARIABLE_PATTERN, (_match, key: string) => payloadValue(payload, key));

const fallbackBody = (
	templateKey: string,
	channel: NotificationChannel,
	payload: Record<string, string>,
): RenderedNotification => ({
	subject: channel === "email" ? "Wez notification" : null,
	body: `${templateKey}: ${JSON.stringify(payload)}`,
});

@Injectable()
export class NotificationTemplateService {
	constructor(private readonly prisma: PrismaService) {}

	async render(input: {
		readonly templateKey: string;
		readonly channel: NotificationChannel;
		readonly payload: Record<string, string>;
		readonly locale?: string | null;
	}): Promise<RenderedNotification> {
		const template = await this.prisma.notificationTemplate.findUnique({
			where: { key: input.templateKey },
			select: { active: true, subjectEn: true, subjectAm: true, bodyEn: true, bodyAm: true },
		});
		if (!template?.active) return fallbackBody(input.templateKey, input.channel, input.payload);

		const locale = input.locale ?? DEFAULT_LOCALE;
		const rawSubject = locale === "am" ? (template.subjectAm ?? template.subjectEn) : template.subjectEn;
		const rawBody = locale === "am" ? (template.bodyAm ?? template.bodyEn) : template.bodyEn;

		return {
			subject: rawSubject ? renderText(rawSubject, input.payload) : null,
			body: renderText(rawBody, input.payload),
		};
	}
}
