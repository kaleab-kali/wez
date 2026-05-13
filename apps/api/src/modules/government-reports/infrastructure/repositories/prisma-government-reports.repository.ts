import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type {
	GovernmentReport,
	GovernmentReportFormat,
	GovernmentReportStatus,
	GovernmentReportType,
	ReportPeriod,
} from "../../domain/entities/government-report.entity";
import type {
	CreatePendingGovernmentReportInput,
	CreateReportAttachmentInput,
	GovernmentReportListFilter,
	GovernmentReportsRepository,
} from "../../domain/repositories/government-reports.repository";

const DEFAULT_TOTAL_PAGES = 1;
const LOCAL_BUCKET = "local-wez";
const REPORT_OWNER_TYPE = "government_report";
const CLEAN_ATTACHMENT_STATUS = "clean";
const LOCAL_STORAGE_PROVIDER = "local";

type GovernmentReportRow = {
	readonly id: string;
	readonly type: string;
	readonly periodStart: Date;
	readonly periodEnd: Date;
	readonly format: string;
	readonly fileUrl: string | null;
	readonly filedAt: Date | null;
	readonly filedReference: string | null;
	readonly generatedById: string;
	readonly status: string;
	readonly errorMessage: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

const toGovernmentReport = (row: GovernmentReportRow): GovernmentReport => ({
	id: row.id,
	type: row.type as GovernmentReportType,
	periodStart: row.periodStart,
	periodEnd: row.periodEnd,
	format: row.format as GovernmentReportFormat,
	fileUrl: row.fileUrl,
	filedAt: row.filedAt,
	filedReference: row.filedReference,
	generatedById: row.generatedById,
	status: row.status as GovernmentReportStatus,
	errorMessage: row.errorMessage,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaGovernmentReportsRepository implements GovernmentReportsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async list(filter: GovernmentReportListFilter) {
		const where = {
			type: filter.type,
			status: filter.status,
			periodStart: filter.periodStart,
			periodEnd: filter.periodEnd,
		};
		const [items, total] = await this.prisma.$transaction([
			this.prisma.governmentReport.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (filter.page - 1) * filter.limit,
				take: filter.limit,
			}),
			this.prisma.governmentReport.count({ where }),
		]);

		return {
			data: items.map(toGovernmentReport),
			meta: {
				total,
				page: filter.page,
				limit: filter.limit,
				totalPages: Math.ceil(total / filter.limit) || DEFAULT_TOTAL_PAGES,
			},
		};
	}

	async findById(id: string) {
		const row = await this.prisma.governmentReport.findUnique({ where: { id } });
		return row ? toGovernmentReport(row) : null;
	}

	async findByTypeAndPeriod(type: GovernmentReportType, periodStart: Date, periodEnd: Date) {
		const row = await this.prisma.governmentReport.findUnique({
			where: { type_periodStart_periodEnd: { type, periodStart, periodEnd } },
		});
		return row ? toGovernmentReport(row) : null;
	}

	async createPending(input: CreatePendingGovernmentReportInput) {
		const row = await this.prisma.governmentReport.create({
			data: {
				type: input.type,
				periodStart: input.periodStart,
				periodEnd: input.periodEnd,
				format: input.format,
				generatedById: input.generatedById,
				status: "pending",
			},
		});
		return toGovernmentReport(row);
	}

	async resetPending(id: string, input: CreatePendingGovernmentReportInput) {
		const row = await this.prisma.governmentReport.update({
			where: { id },
			data: {
				format: input.format,
				generatedById: input.generatedById,
				status: "pending",
				errorMessage: null,
			},
		});
		return toGovernmentReport(row);
	}

	async markReady(id: string, fileUrl: string) {
		const row = await this.prisma.governmentReport.update({
			where: { id },
			data: {
				fileUrl,
				status: "ready",
				errorMessage: null,
			},
		});
		return toGovernmentReport(row);
	}

	async markError(id: string, errorMessage: string) {
		const row = await this.prisma.governmentReport.update({
			where: { id },
			data: {
				status: "error",
				errorMessage,
			},
		});
		return toGovernmentReport(row);
	}

	async markFiled(id: string, filedReference: string) {
		const row = await this.prisma.governmentReport.update({
			where: { id },
			data: {
				status: "filed",
				filedAt: new Date(),
				filedReference,
			},
		});
		return toGovernmentReport(row);
	}

	async createCleanAttachment(input: CreateReportAttachmentInput) {
		return this.prisma.attachment.create({
			data: {
				storageProvider: LOCAL_STORAGE_PROVIDER,
				bucket: LOCAL_BUCKET,
				key: input.stored.key,
				filename: input.stored.filename,
				mimeType: input.stored.mimeType,
				sizeBytes: input.stored.size,
				uploadedById: input.uploadedById,
				ownerType: REPORT_OWNER_TYPE,
				ownerId: input.reportId,
				status: CLEAN_ATTACHMENT_STATUS,
				checksumSha256: input.checksumSha256,
				uploadedAt: new Date(),
				scannedAt: new Date(),
				expiresAt: input.expiresAt,
			},
			select: { id: true },
		});
	}

	async fetchDataset(period: ReportPeriod) {
		const periodRange = { gte: period.periodStart, lt: period.exclusiveEnd };
		const placementSelect = {
			id: true,
			startDate: true,
			salaryCents: true,
			commissionCents: true,
			paymentMethod: true,
			paymentReference: true,
			paymentReceivedAt: true,
			status: true,
			worker: {
				select: {
					id: true,
					fullName: true,
					fayda: true,
					tin: true,
					tier: true,
					gender: true,
					area: true,
				},
			},
			employer: {
				select: {
					id: true,
					type: true,
					name: true,
					tin: true,
					fayda: true,
					area: true,
					rating: true,
				},
			},
			role: { select: { id: true, name: true, category: true } },
			station: { select: { id: true, name: true, woreda: true } },
		} as const;
		const [placementsStarted, commissionPayments, complaints, trainingCompletions] = await this.prisma.$transaction([
			this.prisma.placement.findMany({
				where: { startDate: periodRange },
				orderBy: { startDate: "asc" },
				select: placementSelect,
			}),
			this.prisma.placement.findMany({
				where: { paymentReceivedAt: periodRange },
				orderBy: { paymentReceivedAt: "asc" },
				select: placementSelect,
			}),
			this.prisma.complaint.findMany({
				where: {
					OR: [
						{ createdAt: periodRange },
						{ closedAt: periodRange },
						{ status: "referred_external", updatedAt: periodRange },
					],
				},
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					type: true,
					severity: true,
					status: true,
					resolutionTag: true,
					externalCaseId: true,
					createdAt: true,
					updatedAt: true,
					closedAt: true,
				},
			}),
			this.prisma.courseEnrollment.findMany({
				where: { completedAt: periodRange, passed: true },
				orderBy: { completedAt: "asc" },
				select: {
					id: true,
					completedAt: true,
					passed: true,
					course: { select: { id: true, name: true, category: true } },
				},
			}),
		]);

		return { placementsStarted, commissionPayments, complaints, trainingCompletions };
	}
}
