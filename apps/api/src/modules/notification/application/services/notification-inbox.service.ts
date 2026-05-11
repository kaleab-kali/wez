import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";
import { NotificationGateway } from "../../infrastructure/gateways/notification.gateway";

type NotificationScope = {
	readonly userId?: string;
	readonly adminUserId?: string;
};

const scopeForSession = (session: WezSession): NotificationScope =>
	session.kind === "staff" ? { adminUserId: session.user.id } : { userId: session.user.id };

@Injectable()
export class NotificationInboxService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly gateway: NotificationGateway,
	) {}

	async listForSession(session: WezSession, input: { readonly unreadOnly?: boolean; readonly limit?: number }) {
		const scope = scopeForSession(session);
		const data = await this.prisma.notification.findMany({
			where: {
				...scope,
				channel: "in_app",
				readAt: input.unreadOnly ? null : undefined,
			},
			orderBy: { createdAt: "desc" },
			take: input.limit ?? 20,
			select: {
				id: true,
				category: true,
				templateKey: true,
				payload: true,
				subject: true,
				body: true,
				status: true,
				readAt: true,
				createdAt: true,
			},
		});
		const unread = await this.unreadCount(session);
		return { data, meta: { unread } };
	}

	async unreadCount(session: WezSession): Promise<number> {
		return this.prisma.notification.count({
			where: {
				...scopeForSession(session),
				channel: "in_app",
				readAt: null,
			},
		});
	}

	async markRead(session: WezSession, id: string) {
		const existing = await this.prisma.notification.findUnique({
			where: { id },
			select: { id: true, userId: true, adminUserId: true, readAt: true },
		});
		if (!existing) throw new NotFoundException({ code: "NOTIFICATION_NOT_FOUND" });
		this.assertScope(session, existing);
		const row = await this.prisma.notification.update({
			where: { id },
			data: { readAt: existing.readAt ?? new Date() },
		});
		await this.emitBadge(session);
		return row;
	}

	async markAllRead(session: WezSession) {
		const result = await this.prisma.notification.updateMany({
			where: { ...scopeForSession(session), channel: "in_app", readAt: null },
			data: { readAt: new Date() },
		});
		await this.emitBadge(session);
		return { updated: result.count };
	}

	private assertScope(
		session: WezSession,
		notification: { readonly userId: string | null; readonly adminUserId: string | null },
	) {
		const inScope =
			session.kind === "staff" ? notification.adminUserId === session.user.id : notification.userId === session.user.id;
		if (!inScope) throw new ForbiddenException({ code: "NOTIFICATION_NOT_IN_SCOPE" });
	}

	private async emitBadge(session: WezSession) {
		const unread = await this.unreadCount(session);
		this.gateway.emitBadgeCount(session.user.id, unread);
	}
}
