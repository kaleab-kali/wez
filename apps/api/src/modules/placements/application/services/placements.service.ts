import { randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";
import { STORAGE_DRIVER, type StorageDriver } from "#shared/storage/storage.interface";
import type { EndPlacementDto, FinalizePlacementDto, ListPlacementsDto } from "../dto/placement.dto";
import { AgreementPdfService } from "./agreement-pdf.service";

const STORAGE_ORGANIZATION_ID = "wez";
const AGREEMENT_FOLDER = "agreements";

@Injectable()
export class PlacementsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly agreementPdf: AgreementPdfService,
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

	async finalizeFromHireRequest(hireRequestId: string, finalizedByAgentId: string, dto: FinalizePlacementDto) {
		const salaryCents = BigInt(dto.salaryCents);
		const startDate = new Date(dto.startDate);
		const paymentReceivedAt = new Date(dto.paymentReceivedAt);
		const placementId = randomUUID();
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
			return await this.prisma.$transaction(async (tx) => {
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
					await tx.job.update({ where: { id: request.jobId }, data: { status: "filled" } });
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

				return placement;
			});
		} catch (err) {
			await this.storage.delete(agreement.key);
			throw err;
		}
	}

	async end(id: string, dto: EndPlacementDto) {
		return this.prisma.$transaction(async (tx) => {
			const placement = await tx.placement.findUnique({
				where: { id },
				select: { id: true, workerId: true, status: true, startDate: true },
			});
			if (!placement) throw new NotFoundException({ code: "PLACEMENT_NOT_FOUND" });
			if (placement.status !== "active") {
				throw new ConflictException({ code: "PLACEMENT_NOT_ACTIVE" });
			}

			const endDate = new Date(dto.endDate);
			if (endDate < placement.startDate) {
				throw new BadRequestException({ code: "PLACEMENT_END_BEFORE_START" });
			}

			const updated = await tx.placement.update({
				where: { id },
				data: {
					status: "ended",
					endDate,
					endedReason: dto.endedReason,
					ratingByEmployer: dto.ratingByEmployer,
					ratingByWorker: dto.ratingByWorker,
				},
			});
			await tx.worker.update({
				where: { id: placement.workerId },
				data: { available: true },
			});
			return updated;
		});
	}

	private calculateCommission(salaryCents: bigint, commType: string, commValue: number): bigint {
		return commType === "percent" ? (salaryCents * BigInt(commValue)) / 100n : BigInt(commValue) * 100n;
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
