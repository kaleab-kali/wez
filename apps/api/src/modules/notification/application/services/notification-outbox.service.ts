import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { NotificationGateway } from "../../infrastructure/gateways/notification.gateway";

export type NotificationChannel = "sms" | "email" | "in_app";

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
	) {}

	async enqueueCustomer(input: EnqueueCustomerNotificationInput) {
		const row = await this.prisma.notification.create({
			data: {
				userId: input.userId,
				channel: input.channel,
				templateKey: input.templateKey,
				payload: input.payload,
				status: "pending",
			},
		});
		if (input.channel === "in_app") {
			this.gateway.emitToUser(input.userId, row);
		}
		return row;
	}

	async enqueueSms(input: EnqueueSmsInput) {
		return this.prisma.notification.create({
			data: {
				recipientPhone: input.phone,
				channel: "sms",
				templateKey: input.templateKey,
				payload: input.payload,
				status: "pending",
			},
		});
	}

	async enqueueEmail(input: EnqueueEmailInput) {
		return this.prisma.notification.create({
			data: {
				recipientEmail: input.email,
				channel: "email",
				templateKey: input.templateKey,
				payload: input.payload,
				status: "pending",
			},
		});
	}

	async enqueueStaff(input: EnqueueStaffNotificationInput) {
		const row = await this.prisma.notification.create({
			data: {
				adminUserId: input.adminUserId,
				channel: input.channel,
				templateKey: input.templateKey,
				payload: input.payload,
				status: "pending",
			},
		});
		if (input.channel === "in_app") {
			this.gateway.emitToUser(input.adminUserId, row);
		}
		return row;
	}

	async enqueueStationAgents(input: EnqueueStationAgentsInput) {
		const assignments = await this.prisma.agentAssignment.findMany({
			where: { stationId: input.stationId, active: true, removedAt: null },
			select: { userId: true },
		});
		for (const assignment of assignments) {
			await this.enqueueStaff({
				adminUserId: assignment.userId,
				channel: "in_app",
				templateKey: input.templateKey,
				payload: input.payload,
			});
		}
		return { enqueued: assignments.length };
	}
}
