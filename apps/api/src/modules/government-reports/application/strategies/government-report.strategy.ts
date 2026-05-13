import type {
	GovernmentReportDataset,
	GovernmentReportFormat,
	GovernmentReportType,
	ReportPeriod,
	ReportPlacementRow,
} from "../../domain/entities/government-report.entity";

const CSV_MIME_TYPE = "text/csv";
const CURRENCY_DIVISOR = 100n;
const CSV_EXTENSION = "csv";
const ZERO_CENTS = 0n;

type CsvValue = string | number | bigint | Date | boolean | null | undefined;
type CsvRow = readonly CsvValue[];

export type GovernmentReportStrategyInput = {
	readonly type: GovernmentReportType;
	readonly format: GovernmentReportFormat;
	readonly period: ReportPeriod;
	readonly dataset: GovernmentReportDataset;
};

export type GeneratedGovernmentReportFile = {
	readonly buffer: Buffer;
	readonly filename: string;
	readonly mimeType: string;
};

export interface GovernmentReportStrategy {
	readonly type: GovernmentReportType;
	readonly format: GovernmentReportFormat;
	generate(input: GovernmentReportStrategyInput): GeneratedGovernmentReportFile;
}

const formatDate = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : "");
const periodToken = (period: ReportPeriod) => `${formatDate(period.periodStart)}_${formatDate(period.periodEnd)}`;
const centsToBirr = (cents: bigint) => (cents / CURRENCY_DIVISOR).toString();
const sumCents = (items: readonly ReportPlacementRow[], key: "salaryCents" | "commissionCents") => {
	const total = items.reduce((acc, item) => acc + item[key], ZERO_CENTS);
	return total;
};
const csvCell = (value: CsvValue) => {
	const text = value instanceof Date ? value.toISOString() : String(value ?? "");
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csv = (rows: readonly CsvRow[]) => `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
const section = (title: string, rows: readonly CsvRow[]) => [["section", title], ...rows, []] as const;

const uniquePlacements = (items: readonly ReportPlacementRow[]) => {
	const byId = new Map<string, ReportPlacementRow>();
	for (const item of items) {
		byId.set(item.id, item);
	}
	return Array.from(byId.values());
};

const countUnique = (items: readonly ReportPlacementRow[], key: "worker" | "employer") => {
	const ids = new Set(items.map((item) => item[key].id));
	return ids.size;
};

const countBy = (items: readonly ReportPlacementRow[], getKey: (item: ReportPlacementRow) => string) => {
	const counts = new Map<string, number>();
	for (const item of items) {
		const key = getKey(item) || "unknown";
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return Array.from(counts.entries()).sort(([left], [right]) => left.localeCompare(right));
};

const placementLedgerRows = (items: readonly ReportPlacementRow[]): CsvRow[] => [
	[
		"placement_id",
		"start_date",
		"payment_received_at",
		"worker_name",
		"worker_fayda",
		"worker_tin",
		"worker_tier",
		"employer_name",
		"employer_type",
		"employer_tin",
		"employer_fayda",
		"role_category",
		"role_name",
		"station",
		"station_woreda",
		"salary_cents",
		"salary_birr",
		"commission_cents",
		"commission_birr",
		"payment_method",
		"payment_reference",
		"status",
	],
	...items.map((placement) => [
		placement.id,
		formatDate(placement.startDate),
		placement.paymentReceivedAt.toISOString(),
		placement.worker.fullName,
		placement.worker.fayda,
		placement.worker.tin ?? "",
		placement.worker.tier,
		placement.employer.name,
		placement.employer.type,
		placement.employer.tin ?? "",
		placement.employer.fayda ?? "",
		placement.role.category,
		placement.role.name,
		placement.station.name,
		placement.station.woreda,
		placement.salaryCents,
		centsToBirr(placement.salaryCents),
		placement.commissionCents,
		centsToBirr(placement.commissionCents),
		placement.paymentMethod,
		placement.paymentReference,
		placement.status,
	]),
];

export class ErcaMonthlyCsvReportStrategy implements GovernmentReportStrategy {
	readonly type = "erca_monthly" as const;
	readonly format = "csv" as const;

	generate(input: GovernmentReportStrategyInput): GeneratedGovernmentReportFile {
		const placements = uniquePlacements([...input.dataset.placementsStarted, ...input.dataset.commissionPayments]);
		const totalCommissionCents = sumCents(input.dataset.commissionPayments, "commissionCents");
		const totalWagesCents = sumCents(input.dataset.placementsStarted, "salaryCents");
		const employerTypeCounts = countBy(placements, (placement) => placement.employer.type);
		const tierCounts = countBy(placements, (placement) => placement.worker.tier);
		const workersMissingTin = countUnique(
			placements.filter((placement) => !placement.worker.tin),
			"worker",
		);
		const businessEmployersMissingTin = countUnique(
			placements.filter((placement) => placement.employer.type === "business" && !placement.employer.tin),
			"employer",
		);
		const householdEmployersMissingFayda = countUnique(
			placements.filter((placement) => placement.employer.type === "household" && !placement.employer.fayda),
			"employer",
		);
		const missingPaymentReferences = input.dataset.commissionPayments.filter(
			(placement) => placement.paymentReference.trim().length === 0,
		).length;
		const rows = [
			...section("report", [
				["report_type", "erca_monthly"],
				["period_start", formatDate(input.period.periodStart)],
				["period_end", formatDate(input.period.periodEnd)],
			]),
			...section("tax_base", [
				["total_commission_cents", totalCommissionCents],
				["total_commission_birr", centsToBirr(totalCommissionCents)],
				["wages_flowing_through_platform_cents", totalWagesCents],
				["wages_flowing_through_platform_birr", centsToBirr(totalWagesCents)],
				["placements_started", input.dataset.placementsStarted.length],
				["commission_payments_recorded", input.dataset.commissionPayments.length],
				["unique_workers", countUnique(placements, "worker")],
				["unique_employers", countUnique(placements, "employer")],
			]),
			...section(
				"employer_count_by_type",
				employerTypeCounts.map(([type, count]) => [type, count]),
			),
			...section(
				"worker_tier_distribution",
				tierCounts.map(([tier, count]) => [tier, count]),
			),
			...section("compliance_exceptions", [
				["workers_missing_tin", workersMissingTin],
				["business_employers_missing_tin", businessEmployersMissingTin],
				["household_employers_missing_fayda", householdEmployersMissingFayda],
				["commission_payments_missing_reference", missingPaymentReferences],
			]),
			...section("placement_ledger", placementLedgerRows(placements)),
		];
		return {
			buffer: Buffer.from(csv(rows), "utf8"),
			filename: `wez-erca-monthly-${periodToken(input.period)}.${CSV_EXTENSION}`,
			mimeType: CSV_MIME_TYPE,
		};
	}
}

export class MolsQuarterlyCsvReportStrategy implements GovernmentReportStrategy {
	readonly type = "mols_quarterly" as const;
	readonly format = "csv" as const;

	generate(input: GovernmentReportStrategyInput): GeneratedGovernmentReportFile {
		const placements = uniquePlacements(input.dataset.placementsStarted);
		const roleCategoryCounts = countBy(placements, (placement) => placement.role.category);
		const complaintsFiled = input.dataset.complaints.filter(
			(complaint) => complaint.createdAt >= input.period.periodStart && complaint.createdAt < input.period.exclusiveEnd,
		);
		const complaintsResolved = input.dataset.complaints.filter(
			(complaint) => complaint.closedAt !== null && complaint.closedAt < input.period.exclusiveEnd,
		);
		const complaintsEscalated = input.dataset.complaints.filter(
			(complaint) => complaint.status === "referred_external" || complaint.externalCaseId !== null,
		);
		const trainingByCourse = new Map<string, number>();
		for (const completion of input.dataset.trainingCompletions) {
			const key = `${completion.course.category} / ${completion.course.name}`;
			trainingByCourse.set(key, (trainingByCourse.get(key) ?? 0) + 1);
		}
		const rows = [
			...section("report", [
				["report_type", "mols_quarterly"],
				["period_start", formatDate(input.period.periodStart)],
				["period_end", formatDate(input.period.periodEnd)],
			]),
			...section("placement_counts", [
				["total_placements_started", placements.length],
				["active_placements_started", placements.filter((placement) => placement.status === "active").length],
				["ended_placements_started", placements.filter((placement) => placement.status === "ended").length],
				["unique_workers", countUnique(placements, "worker")],
				["unique_employers", countUnique(placements, "employer")],
			]),
			...section(
				"placements_by_role_category",
				roleCategoryCounts.map(([category, count]) => [category, count]),
			),
			...section(
				"workers_trained_by_course",
				Array.from(trainingByCourse.entries()).map(([course, count]) => [course, count]),
			),
			...section("complaints", [
				["filed", complaintsFiled.length],
				["resolved", complaintsResolved.length],
				["escalated_external", complaintsEscalated.length],
			]),
			...section("compliance_attestation", [
				["worker_placement_fees_collected", "none_recorded_by_system"],
				["written_agreements_generated", "tracked_on_placements"],
				["external_escalations_tracked", "external_case_id_when_available"],
				["training_module_status", "deferred_for_current_build"],
			]),
			...section("placement_ledger", placementLedgerRows(placements)),
		];
		return {
			buffer: Buffer.from(csv(rows), "utf8"),
			filename: `wez-mols-quarterly-${periodToken(input.period)}.${CSV_EXTENSION}`,
			mimeType: CSV_MIME_TYPE,
		};
	}
}

export class GovernmentReportStrategyFactory {
	private readonly strategies: readonly GovernmentReportStrategy[];

	constructor(strategies: readonly GovernmentReportStrategy[]) {
		this.strategies = strategies;
	}

	resolve(input: { readonly type: GovernmentReportType; readonly format: GovernmentReportFormat }) {
		return this.strategies.find((strategy) => strategy.type === input.type && strategy.format === input.format);
	}
}
