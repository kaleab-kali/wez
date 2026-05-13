export const GOVERNMENT_REPORT_TYPES = ["erca_monthly", "mols_quarterly"] as const;
export const GOVERNMENT_REPORT_FORMATS = ["csv", "pdf"] as const;
export const GOVERNMENT_REPORT_STATUSES = ["pending", "ready", "filed", "error"] as const;

export type GovernmentReportType = (typeof GOVERNMENT_REPORT_TYPES)[number];
export type GovernmentReportFormat = (typeof GOVERNMENT_REPORT_FORMATS)[number];
export type GovernmentReportStatus = (typeof GOVERNMENT_REPORT_STATUSES)[number];

export type GovernmentReport = {
	readonly id: string;
	readonly type: GovernmentReportType;
	readonly periodStart: Date;
	readonly periodEnd: Date;
	readonly format: GovernmentReportFormat;
	readonly fileUrl: string | null;
	readonly filedAt: Date | null;
	readonly filedReference: string | null;
	readonly generatedById: string;
	readonly status: GovernmentReportStatus;
	readonly errorMessage: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type ReportPeriod = {
	readonly periodStart: Date;
	readonly periodEnd: Date;
	readonly exclusiveEnd: Date;
};

export type ReportWorkerSnapshot = {
	readonly id: string;
	readonly fullName: string;
	readonly fayda: string;
	readonly tin: string | null;
	readonly tier: string;
	readonly gender: string;
	readonly area: string;
};

export type ReportEmployerSnapshot = {
	readonly id: string;
	readonly type: string;
	readonly name: string;
	readonly tin: string | null;
	readonly fayda: string | null;
	readonly area: string;
	readonly rating: string;
};

export type ReportPlacementRow = {
	readonly id: string;
	readonly startDate: Date;
	readonly salaryCents: bigint;
	readonly commissionCents: bigint;
	readonly paymentMethod: string;
	readonly paymentReference: string;
	readonly paymentReceivedAt: Date;
	readonly status: string;
	readonly worker: ReportWorkerSnapshot;
	readonly employer: ReportEmployerSnapshot;
	readonly role: {
		readonly id: string;
		readonly name: string;
		readonly category: string;
	};
	readonly station: {
		readonly id: string;
		readonly name: string;
		readonly woreda: string;
	};
};

export type ReportComplaintRow = {
	readonly id: string;
	readonly type: string;
	readonly severity: string;
	readonly status: string;
	readonly resolutionTag: string | null;
	readonly externalCaseId: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly closedAt: Date | null;
};

export type ReportTrainingRow = {
	readonly id: string;
	readonly completedAt: Date | null;
	readonly passed: boolean | null;
	readonly course: {
		readonly id: string;
		readonly name: string;
		readonly category: string;
	};
};

export type GovernmentReportDataset = {
	readonly placementsStarted: readonly ReportPlacementRow[];
	readonly commissionPayments: readonly ReportPlacementRow[];
	readonly complaints: readonly ReportComplaintRow[];
	readonly trainingCompletions: readonly ReportTrainingRow[];
};
