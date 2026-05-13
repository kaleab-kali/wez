import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { WezSession } from "#shared/auth/session";
import { STORAGE_DRIVER, type StorageDriver } from "#shared/storage/storage.interface";
import {
	type GovernmentReportDataset,
	type GovernmentReportFormat,
	type GovernmentReportType,
	type ReportPeriod,
	type ReportPlacementRow,
} from "../../domain/entities/government-report.entity";
import {
	GOVERNMENT_REPORTS_REPOSITORY,
	type GovernmentReportListFilter,
	type GovernmentReportsRepository,
} from "../../domain/repositories/government-reports.repository";
import type {
	GenerateGovernmentReportDto,
	GovernmentReportPeriodDto,
	ListGovernmentReportsDto,
	MarkGovernmentReportFiledDto,
} from "../dto/government-report.dto";
import {
	ErcaMonthlyCsvReportStrategy,
	type GeneratedGovernmentReportFile,
	GovernmentReportStrategyFactory,
	MolsQuarterlyCsvReportStrategy,
} from "../strategies/government-report.strategy";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const STORAGE_ORGANIZATION_ID = "wez";
const REPORT_FOLDER = "government-reports";
const FILE_CONTENT_URL_PREFIX = "/api/v1/files";
const REPORT_RETENTION_DAYS = 90;
const MILLISECONDS_PER_DAY = 86_400_000;
const MAX_REPORT_PERIOD_DAYS = 370;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ERROR_MESSAGE_MAX_LENGTH = 500;

type GovernmentReportSummary = {
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly money: {
		readonly commissionCents: string;
		readonly wagesCents: string;
	};
	readonly counts: {
		readonly placementsStarted: number;
		readonly commissionPayments: number;
		readonly uniqueWorkers: number;
		readonly uniqueEmployers: number;
		readonly complaintsFiled: number;
		readonly complaintsResolved: number;
		readonly complaintsEscalated: number;
		readonly trainingCompletions: number;
	};
	readonly exceptions: {
		readonly workersMissingTin: number;
		readonly businessEmployersMissingTin: number;
		readonly householdEmployersMissingFayda: number;
		readonly commissionPaymentsMissingReference: number;
	};
	readonly distributions: {
		readonly employerTypes: readonly { readonly key: string; readonly count: number }[];
		readonly workerTiers: readonly { readonly key: string; readonly count: number }[];
		readonly roleCategories: readonly { readonly key: string; readonly count: number }[];
	};
};

@Injectable()
export class GovernmentReportsService {
	private readonly strategyFactory = new GovernmentReportStrategyFactory([
		new ErcaMonthlyCsvReportStrategy(),
		new MolsQuarterlyCsvReportStrategy(),
	]);

	constructor(
		@Inject(GOVERNMENT_REPORTS_REPOSITORY) private readonly reports: GovernmentReportsRepository,
		@Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
	) {}

	async list(filter: ListGovernmentReportsDto) {
		const period =
			filter.periodStart && filter.periodEnd ? this.parsePeriod(filter.periodStart, filter.periodEnd) : undefined;
		const query: GovernmentReportListFilter = {
			type: filter.type,
			status: filter.status,
			periodStart: period?.periodStart,
			periodEnd: period?.periodEnd,
			page: filter.page ?? DEFAULT_PAGE,
			limit: filter.limit ?? DEFAULT_LIMIT,
		};
		return this.reports.list(query);
	}

	async summary(dto: GovernmentReportPeriodDto): Promise<GovernmentReportSummary> {
		const period = this.parsePeriod(dto.periodStart, dto.periodEnd);
		const dataset = await this.reports.fetchDataset(period);
		return this.buildSummary(period, dataset);
	}

	async generate(session: WezSession, dto: GenerateGovernmentReportDto) {
		const period = this.parsePeriod(dto.periodStart, dto.periodEnd);
		const format = dto.format ?? "csv";
		const existing = await this.reports.findByTypeAndPeriod(dto.type, period.periodStart, period.periodEnd);
		if (existing?.status === "ready" || existing?.status === "filed") return existing;
		const report = existing
			? await this.reports.resetPending(existing.id, this.pendingInput(session, dto.type, period, format))
			: await this.reports.createPending(this.pendingInput(session, dto.type, period, format));
		const strategy = this.strategyFactory.resolve({ type: dto.type, format });
		if (!strategy) {
			await this.reports.markError(report.id, "Unsupported government report format.");
			throw new BadRequestException({ code: "GOVERNMENT_REPORT_FORMAT_UNSUPPORTED" });
		}
		const dataset = await this.reports.fetchDataset(period);
		try {
			const generated = strategy.generate({ type: dto.type, format, period, dataset });
			const attachment = await this.storeGeneratedReport(report.id, session, generated);
			return this.reports.markReady(report.id, `${FILE_CONTENT_URL_PREFIX}/${attachment.id}/content`);
		} catch (err) {
			const message = this.toErrorMessage(err);
			await this.reports.markError(report.id, message);
			throw err;
		}
	}

	async markFiled(id: string, dto: MarkGovernmentReportFiledDto) {
		const report = await this.reports.findById(id);
		if (!report) throw new NotFoundException({ code: "GOVERNMENT_REPORT_NOT_FOUND" });
		if (report.status === "filed") throw new ConflictException({ code: "GOVERNMENT_REPORT_ALREADY_FILED" });
		if (report.status !== "ready" || !report.fileUrl) {
			throw new ConflictException({ code: "GOVERNMENT_REPORT_NOT_READY" });
		}
		return this.reports.markFiled(id, dto.filedReference.trim());
	}

	private async storeGeneratedReport(reportId: string, session: WezSession, generated: GeneratedGovernmentReportFile) {
		const checksumSha256 = createHash("sha256").update(generated.buffer).digest("hex");
		const stored = await this.storage.save({
			organizationId: STORAGE_ORGANIZATION_ID,
			folder: REPORT_FOLDER,
			buffer: generated.buffer,
			originalName: generated.filename,
			mimeType: generated.mimeType,
		});
		try {
			return await this.reports.createCleanAttachment({
				reportId,
				uploadedById: session.user.id,
				stored,
				checksumSha256,
				expiresAt: new Date(Date.now() + REPORT_RETENTION_DAYS * MILLISECONDS_PER_DAY),
			});
		} catch (err) {
			await this.storage.delete(stored.key);
			throw err;
		}
	}

	private pendingInput(
		session: WezSession,
		type: GovernmentReportType,
		period: ReportPeriod,
		format: GovernmentReportFormat,
	) {
		return {
			type,
			periodStart: period.periodStart,
			periodEnd: period.periodEnd,
			format,
			generatedById: session.user.id,
		};
	}

	private parsePeriod(periodStart: string, periodEnd: string): ReportPeriod {
		const start = this.parseDateOnly(periodStart);
		const end = this.parseDateOnly(periodEnd);
		if (start > end) throw new BadRequestException({ code: "REPORT_PERIOD_INVALID" });
		const exclusiveEnd = new Date(end);
		exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
		const days = Math.ceil((exclusiveEnd.getTime() - start.getTime()) / MILLISECONDS_PER_DAY);
		if (days > MAX_REPORT_PERIOD_DAYS) throw new BadRequestException({ code: "REPORT_PERIOD_TOO_LONG" });
		return { periodStart: start, periodEnd: end, exclusiveEnd };
	}

	private parseDateOnly(value: string): Date {
		if (!DATE_ONLY_PATTERN.test(value)) throw new BadRequestException({ code: "DATE_ONLY_REQUIRED" });
		const parsed = new Date(`${value}T00:00:00.000Z`);
		if (Number.isNaN(parsed.getTime())) throw new BadRequestException({ code: "DATE_ONLY_REQUIRED" });
		return parsed;
	}

	private buildSummary(period: ReportPeriod, dataset: GovernmentReportDataset): GovernmentReportSummary {
		const placements = this.uniquePlacements([...dataset.placementsStarted, ...dataset.commissionPayments]);
		return {
			periodStart: period.periodStart.toISOString(),
			periodEnd: period.periodEnd.toISOString(),
			money: {
				commissionCents: this.sumCents(dataset.commissionPayments, "commissionCents").toString(),
				wagesCents: this.sumCents(dataset.placementsStarted, "salaryCents").toString(),
			},
			counts: {
				placementsStarted: dataset.placementsStarted.length,
				commissionPayments: dataset.commissionPayments.length,
				uniqueWorkers: this.uniqueCount(placements, "worker"),
				uniqueEmployers: this.uniqueCount(placements, "employer"),
				complaintsFiled: dataset.complaints.filter(
					(complaint) => complaint.createdAt >= period.periodStart && complaint.createdAt < period.exclusiveEnd,
				).length,
				complaintsResolved: dataset.complaints.filter((complaint) => complaint.closedAt !== null).length,
				complaintsEscalated: dataset.complaints.filter(
					(complaint) => complaint.status === "referred_external" || complaint.externalCaseId !== null,
				).length,
				trainingCompletions: dataset.trainingCompletions.length,
			},
			exceptions: {
				workersMissingTin: this.uniqueCount(
					placements.filter((placement) => !placement.worker.tin),
					"worker",
				),
				businessEmployersMissingTin: this.uniqueCount(
					placements.filter((placement) => placement.employer.type === "business" && !placement.employer.tin),
					"employer",
				),
				householdEmployersMissingFayda: this.uniqueCount(
					placements.filter((placement) => placement.employer.type === "household" && !placement.employer.fayda),
					"employer",
				),
				commissionPaymentsMissingReference: dataset.commissionPayments.filter(
					(placement) => placement.paymentReference.trim().length === 0,
				).length,
			},
			distributions: {
				employerTypes: this.countBy(placements, (placement) => placement.employer.type),
				workerTiers: this.countBy(placements, (placement) => placement.worker.tier),
				roleCategories: this.countBy(placements, (placement) => placement.role.category),
			},
		};
	}

	private uniquePlacements(items: readonly ReportPlacementRow[]) {
		const byId = new Map<string, ReportPlacementRow>();
		for (const item of items) byId.set(item.id, item);
		return Array.from(byId.values());
	}

	private uniqueCount(items: readonly ReportPlacementRow[], key: "worker" | "employer") {
		return new Set(items.map((item) => item[key].id)).size;
	}

	private countBy(items: readonly ReportPlacementRow[], getKey: (item: ReportPlacementRow) => string) {
		const counts = new Map<string, number>();
		for (const item of items) {
			const key = getKey(item) || "unknown";
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return Array.from(counts.entries())
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, count]) => ({ key, count }));
	}

	private sumCents(items: readonly ReportPlacementRow[], key: "salaryCents" | "commissionCents") {
		return items.reduce((acc, item) => acc + item[key], 0n);
	}

	private toErrorMessage(err: unknown): string {
		const message = err instanceof Error ? err.message : "Government report generation failed.";
		return message.slice(0, ERROR_MESSAGE_MAX_LENGTH);
	}
}
