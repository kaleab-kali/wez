import { randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import { JobsService } from "#modules/jobs/application/services/jobs.service";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";
import { STORAGE_DRIVER, type StorageDriver } from "#shared/storage/storage.interface";
import { PlacementsRepository } from "../../infrastructure/repositories/placements.repository";
import type {
	EndPlacementDto,
	FinalizeFreshPlacementDto,
	FinalizePlacementDto,
	ListPlacementsDto,
} from "../dto/placement.dto";
import { AgreementPdfService } from "./agreement-pdf.service";
import { PlacementNotificationsService } from "./placement-notifications.service";
import { PlacementStationAccessService } from "./placement-station-access.service";

const STORAGE_ORGANIZATION_ID = "wez";
const AGREEMENT_FOLDER = "agreements";
const RATING_WINDOW_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

type PlacementListFilter = ListPlacementsDto & {
	readonly stationIds?: string[];
};

@Injectable()
export class PlacementsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly agreementPdf: AgreementPdfService,
		private readonly auditEvents: AuditEventsService,
		private readonly jobs: JobsService,
		private readonly placementNotifications: PlacementNotificationsService,
		private readonly stationAccess: PlacementStationAccessService,
		private readonly placements: PlacementsRepository,
		@Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
	) {}

	async listForSession(session: WezSession, filter: ListPlacementsDto) {
		if (session.kind === "staff") {
			if (this.stationAccess.isStationScopedRole(session.user.role)) {
				const stationIds = await this.stationAccess.stationIdsForSession(session);
				if (filter.stationId && !stationIds.includes(filter.stationId)) {
					throw new ForbiddenException({ code: "NOT_YOUR_STATION" });
				}
				return this.list({ ...filter, stationIds: filter.stationId ? undefined : stationIds });
			}
			return this.list(filter);
		}

		if (session.user.role === "worker") {
			const workerId = await this.placements.findWorkerIdByUserId(session.user.id);
			if (!workerId) throw new ForbiddenException({ code: "NO_WORKER_PROFILE" });
			return this.list({ ...filter, workerId, employerId: undefined });
		}

		const employerId = await this.placements.findEmployerIdByUserId(session.user.id);
		if (!employerId) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
		return this.list({ ...filter, employerId, workerId: undefined });
	}

	async list(filter: PlacementListFilter) {
		const { items, total, page, limit } = await this.placements.list(filter);

		return {
			data: items.map((item) => ({
				...item,
				job: item.hireRequest?.job ?? null,
				hireRequest: undefined,
				ratingWindowClosesAt: this.ratingWindowClosesAt(item.endDate),
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
		await this.stationAccess.assertAccess(session, requestSnapshot.stationId);
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
			await this.placementNotifications.enqueueFinalized({
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

	async finalizeFresh(
		session: WezSession,
		dto: FinalizeFreshPlacementDto,
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
		const [worker, employer, role, station, finalizer, workerRole] = await Promise.all([
			this.prisma.worker.findUnique({ where: { id: dto.workerId } }),
			this.prisma.employer.findUnique({ where: { id: dto.employerId } }),
			this.prisma.role.findUnique({ where: { id: dto.roleId } }),
			this.prisma.station.findUnique({ where: { id: dto.stationId } }),
			this.prisma.adminUser.findUnique({ where: { id: finalizedByAgentId }, select: { name: true, email: true } }),
			this.prisma.workerRole.findUnique({
				where: { workerId_roleId: { workerId: dto.workerId, roleId: dto.roleId } },
			}),
		]);
		if (!worker) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		if (!employer) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
		if (!role) throw new NotFoundException({ code: "ROLE_NOT_FOUND" });
		if (!station) throw new NotFoundException({ code: "STATION_NOT_FOUND" });
		if (!role.active) throw new ConflictException({ code: "INVALID_ROLE" });
		if (!station.active) throw new ConflictException({ code: "STATION_INACTIVE" });
		if (!workerRole) throw new BadRequestException({ code: "WORKER_DOES_NOT_PERFORM_ROLE" });
		await this.stationAccess.assertAccess(session, station.id);
		this.assertFreshReady({ worker, employer, role }, salaryCents);

		const commissionCents = this.calculateCommission(salaryCents, role.commType, role.commValue);
		const agreementBuffer = await this.agreementPdf.generate({
			placementId,
			workerName: worker.fullName,
			workerPhone: worker.phone,
			employerName: employer.name,
			employerPhone: employer.phone,
			roleName: role.name,
			stationName: station.name,
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
				const [currentWorker, currentEmployer, currentRole, currentStation, currentWorkerRole] = await Promise.all([
					tx.worker.findUnique({ where: { id: dto.workerId } }),
					tx.employer.findUnique({ where: { id: dto.employerId } }),
					tx.role.findUnique({ where: { id: dto.roleId } }),
					tx.station.findUnique({ where: { id: dto.stationId } }),
					tx.workerRole.findUnique({ where: { workerId_roleId: { workerId: dto.workerId, roleId: dto.roleId } } }),
				]);
				if (!currentWorker) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
				if (!currentEmployer) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
				if (!currentRole) throw new NotFoundException({ code: "ROLE_NOT_FOUND" });
				if (!currentStation) throw new NotFoundException({ code: "STATION_NOT_FOUND" });
				if (!currentRole.active) throw new ConflictException({ code: "INVALID_ROLE" });
				if (!currentStation.active) throw new ConflictException({ code: "STATION_INACTIVE" });
				if (!currentWorkerRole) throw new BadRequestException({ code: "WORKER_DOES_NOT_PERFORM_ROLE" });
				await this.stationAccess.assertAccess(session, currentStation.id);
				this.assertFreshReady({ worker: currentWorker, employer: currentEmployer, role: currentRole }, salaryCents);
				const currentCommissionCents = this.calculateCommission(
					salaryCents,
					currentRole.commType,
					currentRole.commValue,
				);
				const created = await tx.placement.create({
					data: {
						id: placementId,
						workerId: currentWorker.id,
						employerId: currentEmployer.id,
						roleId: currentRole.id,
						stationId: currentStation.id,
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
				await tx.worker.update({
					where: { id: currentWorker.id },
					data: { available: false, placementsCount: { increment: 1 } },
				});
				await tx.employer.update({
					where: { id: currentEmployer.id },
					data: { placementsCount: { increment: 1 } },
				});
				await tx.hireRequest.updateMany({
					where: { workerId: currentWorker.id, status: "awaiting_visit" },
					data: {
						status: "cancelled",
						cancelledAt: new Date(),
						cancellationReason: "Worker placed through a fresh desk placement",
					},
				});
				await this.auditEvents.record(tx, {
					actorId: session.user.id,
					actorRole: session.user.role ?? session.kind,
					action: AUDIT_ACTIONS.placementFinalized,
					targetType: AUDIT_TARGET_TYPES.placement,
					targetId: created.id,
					stationId: currentStation.id,
					context: auditContext,
					metadata: {
						source: "fresh_desk",
						workerId: currentWorker.id,
						employerId: currentEmployer.id,
						roleId: currentRole.id,
						salaryCents: salaryCents.toString(),
						commissionCents: currentCommissionCents.toString(),
						paymentMethod: dto.paymentMethod,
						paymentReferenceLast4: this.auditEvents.paymentReferenceLast4(dto.paymentReference),
						agreementPdfUrl: agreement.url,
					},
				});
				return created;
			});
			await this.placementNotifications.enqueueFinalized({
				placementId: placement.id,
				workerPhone: worker.phone,
				workerName: worker.fullName,
				employerUserId: employer.userId,
				employerPhone: employer.phone,
				employerEmail: employer.email,
				employerName: employer.name,
				roleName: role.name,
				stationName: station.name,
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
			await this.stationAccess.assertAccess(session, placement.stationId);

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
					ratingCommentByEmployer: dto.ratingCommentByEmployer,
					ratingByWorker: dto.ratingByWorker,
					ratingCommentByWorker: dto.ratingCommentByWorker,
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
					ratingCommentByEmployer: dto.ratingCommentByEmployer,
					ratingByWorker: dto.ratingByWorker,
					ratingCommentByWorker: dto.ratingCommentByWorker,
				},
			});
			return ended;
		});
		await this.placementNotifications.enqueueEnded({
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
		return { ...updated, ratingWindowClosesAt: this.ratingWindowClosesAt(updated.endDate) };
	}

	private assertFreshReady(
		input: {
			worker: { available: boolean };
			employer: { rating: string };
			role: { salaryMinCents: bigint; salaryMaxCents: bigint };
		},
		salaryCents: bigint,
	) {
		if (!input.worker.available) {
			throw new ConflictException({ code: "WORKER_NOT_AVAILABLE" });
		}
		if (input.employer.rating === "red") {
			throw new ConflictException({ code: "EMPLOYER_BANNED" });
		}
		if (salaryCents < input.role.salaryMinCents || salaryCents > input.role.salaryMaxCents) {
			throw new BadRequestException({
				code: "SALARY_OUT_OF_ROLE_RANGE",
				details: {
					roleSalaryMinCents: input.role.salaryMinCents.toString(),
					roleSalaryMaxCents: input.role.salaryMaxCents.toString(),
				},
			});
		}
	}

	private calculateCommission(salaryCents: bigint, commType: string, commValue: number): bigint {
		return commType === "percent" ? (salaryCents * BigInt(commValue)) / 100n : BigInt(commValue) * 100n;
	}

	private ratingWindowClosesAt(endDate: Date | null): string | null {
		if (!endDate) return null;
		return new Date(endDate.getTime() + RATING_WINDOW_DAYS * MILLISECONDS_PER_DAY).toISOString();
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
