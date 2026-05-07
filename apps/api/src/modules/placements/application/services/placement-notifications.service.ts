import { Injectable, Logger } from "@nestjs/common";
import { NotificationOutboxService } from "#modules/notification/application/services/notification-outbox.service";

@Injectable()
export class PlacementNotificationsService {
	private readonly logger = new Logger(PlacementNotificationsService.name);

	constructor(private readonly notifications: NotificationOutboxService) {}

	async enqueueFinalized(input: {
		placementId: string;
		workerPhone: string;
		workerName: string;
		employerUserId: string | null;
		employerPhone: string;
		employerEmail: string | null;
		employerName: string;
		roleName: string;
		stationName: string;
		startDate: Date;
		salaryCents: bigint;
		commissionCents: bigint;
		agreementPdfUrl: string;
	}) {
		const payload = {
			placementId: input.placementId,
			workerName: input.workerName,
			employerName: input.employerName,
			roleName: input.roleName,
			stationName: input.stationName,
			startDate: input.startDate.toISOString().slice(0, 10),
			salaryBirr: (input.salaryCents / 100n).toString(),
			commissionBirr: (input.commissionCents / 100n).toString(),
			agreementPdfUrl: input.agreementPdfUrl,
		};
		try {
			await this.notifications.enqueueSms({
				phone: input.workerPhone,
				templateKey: "placement.finalized.worker",
				payload,
			});
			await this.enqueueEmployer({
				userId: input.employerUserId,
				phone: input.employerPhone,
				email: input.employerEmail,
				templateKey: "placement.finalized.employer",
				payload,
			});
		} catch (err) {
			this.logger.error("Failed to enqueue placement finalized notifications", err);
		}
	}

	async enqueueEnded(input: {
		placementId: string;
		workerPhone: string;
		workerName: string;
		employerUserId: string | null;
		employerPhone: string;
		employerEmail: string | null;
		employerName: string;
		roleName: string;
		stationId: string;
		stationName: string;
		endDate: string;
		endedReason: string;
	}) {
		const payload = {
			placementId: input.placementId,
			workerName: input.workerName,
			employerName: input.employerName,
			roleName: input.roleName,
			stationName: input.stationName,
			endDate: input.endDate,
			endedReason: input.endedReason,
		};
		try {
			await this.notifications.enqueueSms({
				phone: input.workerPhone,
				templateKey: "placement.ended.worker",
				payload,
			});
			await this.enqueueEmployer({
				userId: input.employerUserId,
				phone: input.employerPhone,
				email: input.employerEmail,
				templateKey: "placement.ended.employer",
				payload,
			});
			await this.notifications.enqueueStationAgents({
				stationId: input.stationId,
				templateKey: "placement.ended.station_agent",
				payload,
			});
		} catch (err) {
			this.logger.error("Failed to enqueue placement ended notifications", err);
		}
	}

	private async enqueueEmployer(input: {
		userId: string | null;
		phone: string;
		email: string | null;
		templateKey: string;
		payload: Record<string, string>;
	}) {
		if (input.userId) {
			await this.notifications.enqueueCustomer({
				userId: input.userId,
				channel: "in_app",
				templateKey: input.templateKey,
				payload: input.payload,
			});
		}
		await this.notifications.enqueueSms({
			phone: input.phone,
			templateKey: input.templateKey,
			payload: input.payload,
		});
		if (input.email) {
			await this.notifications.enqueueEmail({
				email: input.email,
				templateKey: input.templateKey,
				payload: input.payload,
			});
		}
	}
}
