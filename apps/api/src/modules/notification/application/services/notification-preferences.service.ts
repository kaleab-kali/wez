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

type PreferencePrincipal = {
	readonly userId?: string;
	readonly adminUserId?: string;
};

export type NotificationPreferenceRow = {
	readonly category: string;
	readonly channel: NotificationChannel;
	readonly enabled: boolean;
	readonly locked: boolean;
};

const principalForSession = (session: WezSession): PreferencePrincipal =>
	session.kind === "staff" ? { adminUserId: session.user.id } : { userId: session.user.id };

const preferenceWhere = (principal: PreferencePrincipal, category: string, channel: NotificationChannel) => ({
	userId: principal.userId,
	adminUserId: principal.adminUserId,
	category,
	channel,
});

@Injectable()
export class NotificationPreferencesService {
	constructor(private readonly prisma: PrismaService) {}

	async listForSession(session: WezSession): Promise<{ data: NotificationPreferenceRow[] }> {
		const principal = principalForSession(session);
		const rows = await this.prisma.notificationPreference.findMany({
			where: principal,
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
		const principal = principalForSession(session);
		const existing = await this.prisma.notificationPreference.findFirst({
			where: preferenceWhere(principal, input.category, input.channel),
			select: { id: true },
		});
		const row = existing
			? await this.prisma.notificationPreference.update({
					where: { id: existing.id },
					data: { enabled: input.enabled },
					select: { category: true, channel: true, enabled: true },
				})
			: await this.prisma.notificationPreference.create({
					data: { ...principal, category: input.category, channel: input.channel, enabled: input.enabled },
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
