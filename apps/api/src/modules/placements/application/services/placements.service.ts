import { randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import { JobsService } from "#modules/jobs/application/services/jobs.service";
import { NotificationOutboxService } from "#modules/notification/application/services/notification-outbox.service";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";
import { STORAGE_DRIVER, type StorageDriver } from "#shared/storage/storage.interface";
import type { EndPlacementDto, FinalizePlacementDto, ListPlacementsDto } from "../dto/placement.dto";
import { AgreementPdfService } from "./agreement-pdf.service";

const STORAGE_ORGANIZATION_ID = "wez";
const AGREEMENT_FOLDER = "agreements";

@Injectable()
export class PlacementsService {
	private readonly logger = new Logger(PlacementsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly agreementPdf: AgreementPdfService,
		private readonly auditEvents: AuditEventsService,
		private readonly jobs: JobsService,
		private readonly notifications: NotificationOutboxService,
		@Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
	) {}

	async listForSession(session: WezSession, filter: ListPlacementsDto) {
		if (session.kind === "staff") {
			return this.list(filter);
		}

		if (session.user.role === "worker") {
			const worker = await this.prisma.worker.findUnique({
				where: { userId: session.user.id },
				select: { id: true },
			});
			if (!worker) throw new ForbiddenException({ code: "NO_WORKER_PROFILE" });
			return this.list({ ...filter, workerId: worker.id, employerId: undefined });
		}

		const employer = await this.prisma.employer.findUnique({
			where: { userId: session.user.id },
			select: { id: true },
		});
		if (!employer) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
		return this.list({ ...filter, employerId: employer.id, workerId: undefined });
	}

	async list(filter: ListPlacementsDto) {
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		const where = {
			status: filter.status,
			workerId: filter.workerId,
			employerId: filter.employerId,
			stationId: filter.stationId,
		};
		const [items, total] = await this.prisma.$transaction([
			this.prisma.placement.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
				include: {
					worker: { select: { fullName: true, phone: true, area: true } },
					employer: { select: { name: true, type: true, phone: true, rating: true } },
					role: {
						select: {
							name: true,
							category: true,
							commType: true,
							commValue: true,
							salaryMinCents: true,
							salaryMaxCents: true,
						},
					},
					station: { select: { name: true, woreda: true } },
					finalizedByAgent: { select: { name: true, email: true } },
					hireRequest: { select: { job: { select: { id: true, title: true, location: true } } } },
				},
			}),
			this.prisma.placement.count({ where }),
		]);

		return {
			data: items.map((item) => ({
				...item,
				job: item.hireRequest?.job ?? null,
				hireRequest: undefined,
			})),
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async finalizeFromHireRequest(
		hireRequestId: string,
		session: WezSession,
		dto: FinalizePlacementDto,
		auditContext: AuditRequestContext | undefined,
	) {
		const salaryCents = BigInt(dto.salaryCents);
		const startDate = new Date(dto.startDate);
		const paymentReceivedAt = new Date(dto.paymentReceivedAt);
		const placementId = randomUUID();
		const finalizedByAgentId = session.user.id;
		if (dto.paymentMethod === "cash" && dto.cashDoubleConfirmed !== true) {
			throw new BadRequestException({ code: "CASH_DOUBLE_CONFIRMATION_REQUIRED" });
		}
		const requestSnapshot = await this.prisma.hireRequest.findUnique({
			where: { id: hireRequestId },
			include: { role: true, placement: true, worker: true, employer: true, station: true },
		});
		if (!requestSnapshot) throw new NotFoundException({ code: "HIRE_REQUEST_NOT_FOUND" });
		this.assertFinalizeReady(requestSnapshot, salaryCents);

		const commissionCents = this.calculateCommission(
			salaryCents,
			requestSnapshot.role.commType,
			requestSnapshot.role.commValue,
		);
		const finalizer = await this.prisma.adminUser.findUnique({
			where: { id: finalizedByAgentId },
			select: { name: true, email: true },
		});
		const agreementBuffer = await this.agreementPdf.generate({
			placementId,
			workerName: requestSnapshot.worker.fullName,
			workerPhone: requestSnapshot.worker.phone,
			employerName: requestSnapshot.employer.name,
			employerPhone: requestSnapshot.employer.phone,
			roleName: requestSnapshot.role.name,
			stationName: requestSnapshot.station.name,
			startDate,
			salaryCents,
			commissionCents,
			paymentMethod: dto.paymentMethod,
			paymentReference: dto.paymentReference,
			finalizedBy: finalizer?.name ?? finalizer?.email ?? finalizedByAgentId,
		});
		const agreement = await this.storage.save({
			organizationId: STORAGE_ORGANIZATION_ID,
			folder: AGREEMENT_FOLDER,
			buffer: agreementBuffer,
			originalName: `${placementId}-agreement.pdf`,
			mimeType: "application/pdf",
		});

		try {
			const placement = await this.prisma.$transaction(async (tx) => {
				const request = await tx.hireRequest.findUnique({
					where: { id: hireRequestId },
					include: { role: true, placement: true, worker: true, employer: true },
				});
				if (!request) throw new NotFoundException({ code: "HIRE_REQUEST_NOT_FOUND" });
				this.assertFinalizeReady(request, salaryCents);
				const currentCommissionCents = this.calculateCommission(
					salaryCents,
					request.role.commType,
					request.role.commValue,
				);

				const placement = await tx.placement.create({
					data: {
						id: placementId,
						hireRequestId: request.id,
						workerId: request.workerId,
						employerId: request.employerId,
						roleId: request.roleId,
						stationId: request.stationId,
						finalizedByAgentId,
						startDate,
						salaryCents,
						commissionCents: currentCommissionCents,
						paymentMethod: dto.paymentMethod,
						paymentReference: dto.paymentReference,
						paymentReceivedAt,
						agreementPdfUrl: agreement.url,
						status: "active",
					},
					include: {
						employer: { select: { name: true } },
						worker: { select: { fullName: true } },
						role: { select: { name: true } },
						station: { select: { name: true } },
					},
				});

				await tx.hireRequest.update({
					where: { id: request.id },
					data: { status: "completed", completedAt: new Date() },
				});
				await tx.worker.update({
					where: { id: request.workerId },
					data: { available: false, placementsCount: { increment: 1 } },
				});
				await tx.employer.update({
					where: { id: request.employerId },
					data: { placementsCount: { increment: 1 } },
				});
				if (request.jobId) {
					await this.jobs.fillFromPlacement(tx, request.jobId, session, auditContext);
				}
				await tx.hireRequest.updateMany({
					where: {
						id: { not: request.id },
						workerId: request.workerId,
						status: "awaiting_visit",
					},
					data: {
						status: "cancelled",
						cancelledAt: new Date(),
						cancellationReason: "Worker placed through another hire request",
					},
				});
				await this.auditEvents.record(tx, {
					actorId: session.user.id,
					actorRole: session.user.role ?? session.kind,
					action: AUDIT_ACTIONS.placementFinalized,
					targetType: AUDIT_TARGET_TYPES.placement,
					targetId: placement.id,
					stationId: request.stationId,
					context: auditContext,
					metadata: {
						hireRequestId: request.id,
						workerId: request.workerId,
						employerId: request.employerId,
						roleId: request.roleId,
						jobId: request.jobId,
						salaryCents: salaryCents.toString(),
						commissionCents: currentCommissionCents.toString(),
						paymentMethod: dto.paymentMethod,
						paymentReferenceLast4: this.auditEvents.paymentReferenceLast4(dto.paymentReference),
						agreementPdfUrl: agreement.url,
					},
				});

				return placement;
			});
			await this.enqueuePlacementFinalizedNotifications({
				placementId: placement.id,
				workerPhone: requestSnapshot.worker.phone,
				workerName: requestSnapshot.worker.fullName,
				employerUserId: requestSnapshot.employer.userId,
				employerPhone: requestSnapshot.employer.phone,
				employerEmail: requestSnapshot.employer.email,
				employerName: requestSnapshot.employer.name,
				roleName: requestSnapshot.role.name,
				stationName: requestSnapshot.station.name,
				startDate,
				salaryCents,
				commissionCents: placement.commissionCents,
				agreementPdfUrl: agreement.url,
			});
			return placement;
		} catch (err) {
			await this.storage.delete(agreement.key);
			throw err;
		}
	}

	async end(id: string, session: WezSession, dto: EndPlacementDto, auditContext: AuditRequestContext | undefined) {
		const updated = await this.prisma.$transaction(async (tx) => {
			const placement = await tx.placement.findUnique({
				where: { id },
				select: {
					id: true,
					workerId: true,
					employerId: true,
					roleId: true,
					stationId: true,
					status: true,
					startDate: true,
					salaryCents: true,
					worker: { select: { fullName: true, phone: true } },
					employer: { select: { name: true, phone: true, email: true, userId: true } },
					role: { select: { name: true } },
					station: { select: { name: true } },
				},
			});
			if (!placement) throw new NotFoundException({ code: "PLACEMENT_NOT_FOUND" });
			if (placement.status !== "active") {
				throw new ConflictException({ code: "PLACEMENT_NOT_ACTIVE" });
			}

			const endDate = new Date(dto.endDate);
			if (endDate < placement.startDate) {
				throw new BadRequestException({ code: "PLACEMENT_END_BEFORE_START" });
			}

			const ended = await tx.placement.update({
				where: { id },
				data: {
					status: "ended",
					endDate,
					endedReason: dto.endedReason,
					ratingByEmployer: dto.ratingByEmployer,
					ratingByWorker: dto.ratingByWorker,
				},
				include: {
					worker: { select: { fullName: true, phone: true } },
					employer: { select: { name: true, phone: true, email: true, userId: true } },
					role: { select: { name: true } },
					station: { select: { name: true } },
				},
			});
			await tx.worker.update({
				where: { id: placement.workerId },
				data: { available: true },
			});
			await this.auditEvents.record(tx, {
				actorId: session.user.id,
				actorRole: session.user.role ?? session.kind,
				action: AUDIT_ACTIONS.placementEnded,
				targetType: AUDIT_TARGET_TYPES.placement,
				targetId: placement.id,
				stationId: placement.stationId,
				context: auditContext,
				metadata: {
					workerId: placement.workerId,
					employerId: placement.employerId,
					roleId: placement.roleId,
					salaryCents: placement.salaryCents.toString(),
					endDate: dto.endDate,
					endedReason: dto.endedReason,
					ratingByEmployer: dto.ratingByEmployer,
					ratingByWorker: dto.ratingByWorker,
				},
			});
			return ended;
		});
		await this.enqueuePlacementEndedNotifications({
			placementId: updated.id,
			workerPhone: updated.worker.phone,
			workerName: updated.worker.fullName,
			employerUserId: updated.employer.userId,
			employerPhone: updated.employer.phone,
			employerEmail: updated.employer.email,
			employerName: updated.employer.name,
			roleName: updated.role.name,
			stationId: updated.stationId,
			stationName: updated.station.name,
			endDate: dto.endDate,
			endedReason: dto.endedReason,
		});
		return updated;
	}

	private calculateCommission(salaryCents: bigint, commType: string, commValue: number): bigint {
		return commType === "percent" ? (salaryCents * BigInt(commValue)) / 100n : BigInt(commValue) * 100n;
	}

	private async enqueuePlacementFinalizedNotifications(input: {
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
			await this.enqueueEmployerNotification({
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

	private async enqueuePlacementEndedNotifications(input: {
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
			await this.enqueueEmployerNotification({
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

	private async enqueueEmployerNotification(input: {
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

	private assertFinalizeReady(
		request: {
			placement: unknown;
			status: string;
			worker: { available: boolean };
			employer: { rating: string };
			role: { salaryMinCents: bigint; salaryMaxCents: bigint };
		},
		salaryCents: bigint,
	) {
		if (request.placement) throw new ConflictException({ code: "PLACEMENT_ALREADY_EXISTS" });
		if (request.status !== "awaiting_visit") {
			throw new ConflictException({ code: "HIRE_REQUEST_NOT_AWAITING_VISIT" });
		}
		if (!request.worker.available) {
			throw new ConflictException({ code: "WORKER_NOT_AVAILABLE" });
		}
		if (request.employer.rating === "red") {
			throw new ConflictException({ code: "EMPLOYER_BANNED" });
		}
		if (salaryCents < request.role.salaryMinCents || salaryCents > request.role.salaryMaxCents) {
			throw new BadRequestException({
				code: "SALARY_OUT_OF_ROLE_RANGE",
				details: {
					roleSalaryMinCents: request.role.salaryMinCents.toString(),
					roleSalaryMaxCents: request.role.salaryMaxCents.toString(),
				},
			});
		}
	}
}
