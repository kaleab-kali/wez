import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { categoryFromTemplateKey, type NotificationChannel } from "../../domain/entities/notification.entity";
import { NotificationGateway } from "../../infrastructure/gateways/notification.gateway";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationTemplateService } from "./notification-template.service";

type EnqueueCustomerNotificationInput = {
	readonly userId: string;
	readonly channel: NotificationChannel;
	readonly templateKey: string;
	readonly payload: Record<string, string>;
};

type EnqueueStaffNotificationInput = {
	readonly adminUserId: string;
	readonly channel: NotificationChannel;
	readonly templateKey: string;
	readonly payload: Record<string, string>;
};

type EnqueueStaffChannelsInput = {
	readonly adminUserId: string;
	readonly channels: readonly NotificationChannel[];
	readonly templateKey: string;
	readonly payload: Record<string, string>;
};

type EnqueueSmsInput = {
	readonly phone: string;
	readonly templateKey: string;
	readonly payload: Record<string, string>;
};

type EnqueueEmailInput = {
	readonly email: string;
	readonly templateKey: string;
	readonly payload: Record<string, string>;
};

type EnqueueStationAgentsInput = {
	readonly stationId: string;
	readonly templateKey: string;
	readonly payload: Record<string, string>;
};

@Injectable()
export class NotificationOutboxService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly gateway: NotificationGateway,
		private readonly templates: NotificationTemplateService,
		private readonly preferences: NotificationPreferencesService,
	) {}

	async enqueueCustomer(input: EnqueueCustomerNotificationInput) {
		const category = categoryFromTemplateKey(input.templateKey);
		const enabled = await this.preferences.isEnabled({
			userId: input.userId,
			category,
			channel: input.channel,
		});
		if (!enabled) return null;
		const locale = await this.customerLocale(input.userId);
		const row = await this.createNotification({
			userId: input.userId,
			channel: input.channel,
			category,
			templateKey: input.templateKey,
			payload: input.payload,
			locale,
		});
		if (input.channel === "in_app") {
			this.gateway.emitToPrincipal("customer", input.userId, row);
			await this.emitBadge("customer", input.userId);
		}
		return row;
	}

	async enqueueSms(input: EnqueueSmsInput) {
		return this.createNotification({
			recipientPhone: input.phone,
			channel: "sms",
			category: categoryFromTemplateKey(input.templateKey),
			templateKey: input.templateKey,
			payload: input.payload,
		});
	}

	async enqueueEmail(input: EnqueueEmailInput) {
		return this.createNotification({
			recipientEmail: input.email,
			channel: "email",
			category: categoryFromTemplateKey(input.templateKey),
			templateKey: input.templateKey,
			payload: input.payload,
		});
	}

	async enqueueStaff(input: EnqueueStaffNotificationInput) {
		const category = categoryFromTemplateKey(input.templateKey);
		const enabled = await this.preferences.isEnabled({
			adminUserId: input.adminUserId,
			category,
			channel: input.channel,
		});
		if (!enabled) return null;
		const row = await this.createNotification({
			adminUserId: input.adminUserId,
			channel: input.channel,
			category,
			templateKey: input.templateKey,
			payload: input.payload,
		});
		if (input.channel === "in_app") {
			this.gateway.emitToPrincipal("staff", input.adminUserId, row);
			await this.emitBadge("staff", input.adminUserId);
		}
		return row;
	}

	async enqueueStaffChannels(input: EnqueueStaffChannelsInput) {
		const staff = await this.prisma.adminUser.findUnique({
			where: { id: input.adminUserId },
			select: { active: true, email: true },
		});
		if (!staff?.active) return { enqueued: 0 };

		const enqueuedIds: string[] = [];
		for (const channel of input.channels) {
			if (channel === "in_app") {
				const row = await this.enqueueStaff({
					adminUserId: input.adminUserId,
					channel,
					templateKey: input.templateKey,
					payload: input.payload,
				});
				if (row) enqueuedIds.push(row.id);
			}
			if (channel === "email" && staff.email) {
				const enabled = await this.preferences.isEnabled({
					adminUserId: input.adminUserId,
					category: categoryFromTemplateKey(input.templateKey),
					channel,
				});
				if (!enabled) continue;
				const row = await this.createNotification({
					adminUserId: input.adminUserId,
					recipientEmail: staff.email,
					channel,
					category: categoryFromTemplateKey(input.templateKey),
					templateKey: input.templateKey,
					payload: input.payload,
				});
				enqueuedIds.push(row.id);
			}
		}
		return { enqueued: enqueuedIds.length };
	}

	async enqueueStationAgents(input: EnqueueStationAgentsInput) {
		const assignments = await this.prisma.agentAssignment.findMany({
			where: { stationId: input.stationId, active: true, removedAt: null },
			select: { userId: true },
		});
		const enqueuedIds: string[] = [];
		for (const assignment of assignments) {
			const row = await this.enqueueStaff({
				adminUserId: assignment.userId,
				channel: "in_app",
				templateKey: input.templateKey,
				payload: input.payload,
			});
			if (row) enqueuedIds.push(row.id);
		}
		return { enqueued: enqueuedIds.length };
	}

	private async createNotification(input: {
		readonly userId?: string;
		readonly adminUserId?: string;
		readonly recipientPhone?: string;
		readonly recipientEmail?: string;
		readonly channel: NotificationChannel;
		readonly category: string;
		readonly templateKey: string;
		readonly payload: Record<string, string>;
		readonly locale?: string | null;
	}) {
		const rendered = await this.templates.render({
			templateKey: input.templateKey,
			channel: input.channel,
			payload: input.payload,
			locale: input.locale,
		});
		return this.prisma.notification.create({
			data: {
				userId: input.userId,
				adminUserId: input.adminUserId,
				recipientPhone: input.recipientPhone,
				recipientEmail: input.recipientEmail,
				channel: input.channel,
				category: input.category,
				templateKey: input.templateKey,
				payload: input.payload,
				subject: rendered.subject,
				body: rendered.body,
				status: input.channel === "in_app" ? "sent" : "pending",
				sentAt: input.channel === "in_app" ? new Date() : null,
			},
		});
	}

	private async customerLocale(userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { localePref: true } });
		return user?.localePref ?? "en";
	}

	private async emitBadge(kind: "staff" | "customer", userId: string) {
		const unread = await this.prisma.notification.count({
			where: {
				...(kind === "staff" ? { adminUserId: userId } : { userId }),
				channel: "in_app",
				readAt: null,
			},
		});
		this.gateway.emitBadgeCount(kind, userId, unread);
	}
}
