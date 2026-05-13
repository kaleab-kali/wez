import type { StoredFile } from "#shared/storage/storage.interface";
import type {
	GovernmentReport,
	GovernmentReportDataset,
	GovernmentReportFormat,
	GovernmentReportStatus,
	GovernmentReportType,
	ReportPeriod,
} from "../entities/government-report.entity";

export type GovernmentReportListFilter = {
	readonly type?: GovernmentReportType;
	readonly status?: GovernmentReportStatus;
	readonly periodStart?: Date;
	readonly periodEnd?: Date;
	readonly page: number;
	readonly limit: number;
};

export type CreatePendingGovernmentReportInput = {
	readonly type: GovernmentReportType;
	readonly periodStart: Date;
	readonly periodEnd: Date;
	readonly format: GovernmentReportFormat;
	readonly generatedById: string;
};

export type CreateReportAttachmentInput = {
	readonly reportId: string;
	readonly uploadedById: string;
	readonly stored: StoredFile;
	readonly checksumSha256: string;
	readonly expiresAt: Date;
};

export type GovernmentReportsPage = {
	readonly data: readonly GovernmentReport[];
	readonly meta: {
		readonly total: number;
		readonly page: number;
		readonly limit: number;
		readonly totalPages: number;
	};
};

export const GOVERNMENT_REPORTS_REPOSITORY = Symbol("GovernmentReportsRepository");

export interface GovernmentReportsRepository {
	list(filter: GovernmentReportListFilter): Promise<GovernmentReportsPage>;
	findById(id: string): Promise<GovernmentReport | null>;
	findByTypeAndPeriod(type: GovernmentReportType, periodStart: Date, periodEnd: Date): Promise<GovernmentReport | null>;
	createPending(input: CreatePendingGovernmentReportInput): Promise<GovernmentReport>;
	resetPending(id: string, input: CreatePendingGovernmentReportInput): Promise<GovernmentReport>;
	markReady(id: string, fileUrl: string): Promise<GovernmentReport>;
	markError(id: string, errorMessage: string): Promise<GovernmentReport>;
	markFiled(id: string, filedReference: string): Promise<GovernmentReport>;
	createCleanAttachment(input: CreateReportAttachmentInput): Promise<{ readonly id: string }>;
	fetchDataset(period: ReportPeriod): Promise<GovernmentReportDataset>;
}
