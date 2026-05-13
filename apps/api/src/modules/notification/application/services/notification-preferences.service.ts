import { BadRequestException, Injectable } from "@nestjs/common";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";
import {
	isNotificationChannel,
	isTransactionalCategory,
	NOTIFICATION_CATEGORIES,
	NOTIFICATION_CHANNELS,
	type NotificationChannel,
} from "../../domain/entities/notification.entity";

export type NotificationPreferenceRow = {
	readonly category: string;
	readonly channel: NotificationChannel;
	readonly enabled: boolean;
	readonly locked: boolean;
};

const principalWhereForSession = (session: WezSession) =>
	session.kind === "staff" ? { adminUserId: session.user.id } : { userId: session.user.id };

@Injectable()
export class NotificationPreferencesService {
	constructor(private readonly prisma: PrismaService) {}

	async listForSession(session: WezSession): Promise<{ data: NotificationPreferenceRow[] }> {
		const rows = await this.prisma.notificationPreference.findMany({
			where: principalWhereForSession(session),
			select: { category: true, channel: true, enabled: true },
		});
		const current = new Map(rows.map((row) => [`${row.category}:${row.channel}`, row.enabled]));
		return {
			data: NOTIFICATION_CATEGORIES.flatMap((category) =>
				NOTIFICATION_CHANNELS.map((channel) => ({
					category,
					channel,
					enabled: isTransactionalCategory(category) ? true : (current.get(`${category}:${channel}`) ?? true),
					locked: isTransactionalCategory(category),
				})),
			),
		};
	}

	async updateForSession(
		session: WezSession,
		input: { readonly category: string; readonly channel: string; readonly enabled: boolean },
	): Promise<NotificationPreferenceRow> {
		if (!isNotificationChannel(input.channel)) throw new BadRequestException({ code: "INVALID_NOTIFICATION_CHANNEL" });
		if (isTransactionalCategory(input.category)) {
			throw new BadRequestException({ code: "TRANSACTIONAL_NOTIFICATION_REQUIRED" });
		}
		const row =
			session.kind === "staff"
				? await this.prisma.notificationPreference.upsert({
						where: {
							adminUserId_category_channel: {
								adminUserId: session.user.id,
								category: input.category,
								channel: input.channel,
							},
						},
						update: { enabled: input.enabled },
						create: {
							adminUserId: session.user.id,
							category: input.category,
							channel: input.channel,
							enabled: input.enabled,
						},
						select: { category: true, channel: true, enabled: true },
					})
				: await this.prisma.notificationPreference.upsert({
						where: {
							userId_category_channel: {
								userId: session.user.id,
								category: input.category,
								channel: input.channel,
							},
						},
						update: { enabled: input.enabled },
						create: {
							userId: session.user.id,
							category: input.category,
							channel: input.channel,
							enabled: input.enabled,
						},
						select: { category: true, channel: true, enabled: true },
					});
		return { ...row, channel: row.channel as NotificationChannel, locked: false };
	}

	async isEnabled(input: {
		readonly userId?: string | null;
		readonly adminUserId?: string | null;
		readonly category: string;
		readonly channel: NotificationChannel;
	}): Promise<boolean> {
		if (isTransactionalCategory(input.category)) return true;
		if (!input.userId && !input.adminUserId) return true;
		const preference = await this.prisma.notificationPreference.findFirst({
			where: {
				userId: input.userId ?? undefined,
				adminUserId: input.adminUserId ?? undefined,
				category: input.category,
				channel: input.channel,
			},
			select: { enabled: true },
		});
		return preference?.enabled ?? true;
	}
}
