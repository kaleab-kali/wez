import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type GovernmentReport,
	type GovernmentReportStatus,
	type GovernmentReportType,
	useGenerateGovernmentReport,
	useGovernmentReportSummary,
	useGovernmentReports,
	useMarkGovernmentReportFiled,
} from "#features/government-reports/api/government-report.queries";
import { DataTable } from "#shared/components/DataTable";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REPORT_TYPES = ["erca_monthly", "mols_quarterly"] as const;
const REPORT_STATUSES = ["pending", "ready", "filed", "error"] as const;
const MONTH_PERIOD_PRESETS = ["current_month", "last_month"] as const;
const QUARTER_PERIOD_PRESETS = ["current_quarter", "last_quarter"] as const;
const ALL_FILTER_VALUE = "all";
const CURRENCY_DIVISOR = 100;
const FIRST_DAY_OF_MONTH = 1;
const LAST_DAY_OF_PREVIOUS_MONTH = 0;
const NEXT_MONTH_OFFSET = 1;
const MONTHS_PER_QUARTER = 3;
const PREVIOUS_PERIOD_OFFSET = -1;
const CURRENT_PERIOD_OFFSET = 0;
const DEFAULT_REPORT_TYPE = "erca_monthly" satisfies GovernmentReportType;
const DEFAULT_PERIOD_PRESET = "current_month" satisfies PeriodPreset;

type PeriodPreset = "current_month" | "last_month" | "current_quarter" | "last_quarter";
type Translation = (key: string, options?: Record<string, unknown>) => string;

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const getMonthPeriod = (monthOffset: number) => {
	const now = new Date();
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, FIRST_DAY_OF_MONTH));
	const end = new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + NEXT_MONTH_OFFSET, LAST_DAY_OF_PREVIOUS_MONTH),
	);

	return { periodStart: dateOnly(start), periodEnd: dateOnly(end) };
};
const getQuarterPeriod = (quarterOffset: number) => {
	const now = new Date();
	const currentQuarterStartMonth = Math.floor(now.getUTCMonth() / MONTHS_PER_QUARTER) * MONTHS_PER_QUARTER;
	const start = new Date(
		Date.UTC(now.getUTCFullYear(), currentQuarterStartMonth + quarterOffset * MONTHS_PER_QUARTER, FIRST_DAY_OF_MONTH),
	);
	const end = new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + MONTHS_PER_QUARTER, LAST_DAY_OF_PREVIOUS_MONTH),
	);

	return { periodStart: dateOnly(start), periodEnd: dateOnly(end) };
};
const getPeriodForPreset = (preset: PeriodPreset) => {
	if (preset === "current_month") return getMonthPeriod(CURRENT_PERIOD_OFFSET);
	if (preset === "last_month") return getMonthPeriod(PREVIOUS_PERIOD_OFFSET);
	if (preset === "current_quarter") return getQuarterPeriod(CURRENT_PERIOD_OFFSET);

	return getQuarterPeriod(PREVIOUS_PERIOD_OFFSET);
};
const getPresetsForReportType = (type: GovernmentReportType): readonly PeriodPreset[] =>
	type === "erca_monthly" ? MONTH_PERIOD_PRESETS : QUARTER_PERIOD_PRESETS;
const defaultPeriodForReportType = (type: GovernmentReportType): PeriodPreset =>
	type === "erca_monthly" ? "current_month" : "current_quarter";
const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
const formatCents = (value: string) =>
	`${(Number(value) / CURRENCY_DIVISOR).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB`;

const reportTypeLabel = (type: GovernmentReportType, t: Translation) =>
	type === "erca_monthly" ? t("governmentReports.types.erca") : t("governmentReports.types.mols");
const reportTypeDescription = (type: GovernmentReportType, t: Translation) =>
	type === "erca_monthly" ? t("governmentReports.types.ercaBody") : t("governmentReports.types.molsBody");
const reportStatusLabel = (status: GovernmentReportStatus, t: Translation) => t(`governmentReports.status.${status}`);
const statusVariant = (status: GovernmentReportStatus): "default" | "secondary" | "destructive" | "outline" => {
	if (status === "filed") return "default";
	if (status === "ready") return "secondary";
	if (status === "error") return "destructive";

	return "outline";
};
const choiceClassName = (selected: boolean) =>
	[
		"min-h-28 rounded-md border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2",
		"focus-visible:ring-ring focus-visible:ring-offset-2",
		selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:bg-muted/40",
	].join(" ");
const presetClassName = (selected: boolean) =>
	[
		"min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition focus-visible:outline-none",
		"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted/40",
	].join(" ");

const ReportTypeChoice = React.memo(
	({
		value,
		currentValue,
		label,
		description,
		onSelect,
	}: {
		readonly value: GovernmentReportType;
		readonly currentValue: GovernmentReportType;
		readonly label: string;
		readonly description: string;
		readonly onSelect: (type: GovernmentReportType) => void;
	}) => {
		const selected = value === currentValue;
		const onClick = React.useCallback(() => onSelect(value), [onSelect, value]);

		return (
			<button type="button" aria-pressed={selected} className={choiceClassName(selected)} onClick={onClick}>
				<span className="block text-base font-semibold">{label}</span>
				<span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
			</button>
		);
	},
);
ReportTypeChoice.displayName = "ReportTypeChoice";

const PeriodPresetChoice = React.memo(
	({
		value,
		currentValue,
		label,
		onSelect,
	}: {
		readonly value: PeriodPreset;
		readonly currentValue: PeriodPreset | undefined;
		readonly label: string;
		readonly onSelect: (preset: PeriodPreset) => void;
	}) => {
		const selected = value === currentValue;
		const onClick = React.useCallback(() => onSelect(value), [onSelect, value]);

		return (
			<button type="button" aria-pressed={selected} className={presetClassName(selected)} onClick={onClick}>
				{label}
			</button>
		);
	},
);
PeriodPresetChoice.displayName = "PeriodPresetChoice";

const StepHeader = React.memo(({ number, title }: { readonly number: string; readonly title: string }) => (
	<div className="mb-3 flex items-center gap-3">
		<span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
			{number}
		</span>
		<h2 className="text-sm font-semibold">{title}</h2>
	</div>
));
StepHeader.displayName = "StepHeader";

const MetricCard = React.memo(
	({ label, value, help }: { readonly label: string; readonly value: string | number; readonly help?: string }) => (
		<div className="rounded-md border bg-background p-4">
			<p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
			<p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
			{help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
		</div>
	),
);
MetricCard.displayName = "MetricCard";

const FilingDialog = React.memo(
	({
		report,
		value,
		error,
		isSaving,
		onChange,
		onClose,
		onSubmit,
	}: {
		readonly report: GovernmentReport | null;
		readonly value: string;
		readonly error: string;
		readonly isSaving: boolean;
		readonly onChange: (value: string) => void;
		readonly onClose: () => void;
		readonly onSubmit: (event: React.FormEvent) => void;
	}) => {
		const { t } = useTranslation();
		const onOpenChange = React.useCallback(
			(open: boolean) => {
				if (!open) onClose();
			},
			[onClose],
		);
		const onReferenceChange = React.useCallback(
			(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
			[onChange],
		);

		return (
			<Dialog open={Boolean(report)} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("governmentReports.fileDialog.title")}</DialogTitle>
						<DialogDescription>{t("governmentReports.fileDialog.description")}</DialogDescription>
					</DialogHeader>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="filedReference">{t("governmentReports.fileDialog.reference")}</Label>
							<Input
								id="filedReference"
								value={value}
								onChange={onReferenceChange}
								placeholder={t("governmentReports.fileDialog.placeholder")}
								required
							/>
						</div>
						{error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
						<DialogFooter>
							<Button type="button" variant="outline" onClick={onClose}>
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={isSaving || value.trim().length === 0}>
								{isSaving ? t("common.saving") : t("governmentReports.actions.markFiled")}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);
FilingDialog.displayName = "FilingDialog";

const GovernmentReportsPage = React.memo(() => {
	const { t } = useTranslation();
	const { data: session } = useAdminSession();
	const user = session?.user as { role?: string; roles?: string[] } | undefined;
	const userRoles = React.useMemo(() => effectiveStaffRoles(user?.role, user?.roles), [user?.role, user?.roles]);
	const canFile = hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.reportFiling);
	const defaultPeriod = React.useMemo(() => getPeriodForPreset(DEFAULT_PERIOD_PRESET), []);
	const [periodPreset, setPeriodPreset] = React.useState<PeriodPreset | undefined>(DEFAULT_PERIOD_PRESET);
	const [periodStart, setPeriodStart] = React.useState(defaultPeriod.periodStart);
	const [periodEnd, setPeriodEnd] = React.useState(defaultPeriod.periodEnd);
	const [type, setType] = React.useState<GovernmentReportType>(DEFAULT_REPORT_TYPE);
	const [status, setStatus] = React.useState<GovernmentReportStatus | undefined>();
	const [error, setError] = React.useState("");
	const [filingError, setFilingError] = React.useState("");
	const [filingReference, setFilingReference] = React.useState("");
	const [filingReport, setFilingReport] = React.useState<GovernmentReport | null>(null);
	const availablePresets = React.useMemo(() => getPresetsForReportType(type), [type]);
	const listFilter = React.useMemo(
		() => ({ type, status, periodStart, periodEnd, page: 1, limit: 50 }),
		[periodEnd, periodStart, status, type],
	);
	const periodFilter = React.useMemo(() => ({ periodStart, periodEnd }), [periodStart, periodEnd]);
	const { data: reports, isLoading } = useGovernmentReports(listFilter);
	const { data: summary, isLoading: isSummaryLoading } = useGovernmentReportSummary(periodFilter);
	const generate = useGenerateGovernmentReport();
	const markFiled = useMarkGovernmentReportFiled();

	const onSelectReportType = React.useCallback((nextType: GovernmentReportType) => {
		const nextPreset = defaultPeriodForReportType(nextType);
		const nextPeriod = getPeriodForPreset(nextPreset);
		setType(nextType);
		setPeriodPreset(nextPreset);
		setPeriodStart(nextPeriod.periodStart);
		setPeriodEnd(nextPeriod.periodEnd);
	}, []);
	const onSelectPreset = React.useCallback((preset: PeriodPreset) => {
		const nextPeriod = getPeriodForPreset(preset);
		setPeriodPreset(preset);
		setPeriodStart(nextPeriod.periodStart);
		setPeriodEnd(nextPeriod.periodEnd);
	}, []);
	const onPeriodStartChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPeriodPreset(undefined);
		setPeriodStart(event.target.value);
	}, []);
	const onPeriodEndChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPeriodPreset(undefined);
		setPeriodEnd(event.target.value);
	}, []);
	const onStatusChange = React.useCallback((value: string) => {
		setStatus(value === ALL_FILTER_VALUE ? undefined : (value as GovernmentReportStatus));
	}, []);
	const onGenerate = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			setError("");
			try {
				await generate.mutateAsync({ type, periodStart, periodEnd, format: "csv" });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[generate, periodEnd, periodStart, t, type],
	);
	const onDownload = React.useCallback((report: GovernmentReport) => {
		if (!report.fileUrl) return;
		window.open(report.fileUrl, "_blank", "noopener,noreferrer");
	}, []);
	const onStartFiling = React.useCallback((report: GovernmentReport) => {
		setFilingError("");
		setFilingReference(report.filedReference ?? "");
		setFilingReport(report);
	}, []);
	const onCloseFiling = React.useCallback(() => {
		setFilingReport(null);
		setFilingReference("");
		setFilingError("");
	}, []);
	const onSubmitFiling = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			if (!filingReport) return;
			setFilingError("");
			try {
				await markFiled.mutateAsync({ id: filingReport.id, filedReference: filingReference.trim() });
				onCloseFiling();
			} catch (err) {
				setFilingError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[filingReference, filingReport, markFiled, onCloseFiling, t],
	);
	const columns = React.useMemo<ColumnDef<GovernmentReport>[]>(
		() => [
			{
				accessorKey: "type",
				header: t("governmentReports.table.type"),
				cell: ({ row }) => reportTypeLabel(row.original.type, t),
			},
			{
				accessorKey: "periodStart",
				header: t("governmentReports.table.period"),
				cell: ({ row }) => `${formatDate(row.original.periodStart)} - ${formatDate(row.original.periodEnd)}`,
			},
			{
				accessorKey: "status",
				header: t("governmentReports.table.status"),
				cell: ({ row }) => (
					<Badge variant={statusVariant(row.original.status)}>{reportStatusLabel(row.original.status, t)}</Badge>
				),
			},
			{
				accessorKey: "createdAt",
				header: t("governmentReports.table.generated"),
				cell: ({ row }) => formatDate(row.original.createdAt),
			},
			{
				accessorKey: "filedReference",
				header: t("governmentReports.table.filing"),
				cell: ({ row }) => row.original.filedReference ?? t("governmentReports.table.notFiled"),
			},
			{
				id: "actions",
				header: t("governmentReports.table.actions"),
				cell: ({ row }) => (
					<div className="flex flex-wrap justify-end gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!row.original.fileUrl || row.original.status === "error"}
							onClick={() => onDownload(row.original)}
						>
							{t("governmentReports.actions.download")}
						</Button>
						{canFile && row.original.status === "ready" && (
							<Button type="button" size="sm" onClick={() => onStartFiling(row.original)}>
								{t("governmentReports.actions.markFiled")}
							</Button>
						)}
					</div>
				),
			},
		],
		[canFile, onDownload, onStartFiling, t],
	);

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">{t("governmentReports.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("governmentReports.subtitle")}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("governmentReports.generate.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onGenerate} className="space-y-6">
						<section>
							<StepHeader number="1" title={t("governmentReports.generate.officeQuestion")} />
							<div className="grid gap-3 md:grid-cols-2">
								{REPORT_TYPES.map((item) => (
									<ReportTypeChoice
										key={item}
										value={item}
										currentValue={type}
										label={reportTypeLabel(item, t)}
										description={reportTypeDescription(item, t)}
										onSelect={onSelectReportType}
									/>
								))}
							</div>
						</section>

						<section>
							<StepHeader number="2" title={t("governmentReports.generate.periodQuestion")} />
							<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
								{availablePresets.map((preset) => (
									<PeriodPresetChoice
										key={preset}
										value={preset}
										currentValue={periodPreset}
										label={t(`governmentReports.presets.${preset}`)}
										onSelect={onSelectPreset}
									/>
								))}
							</div>
							<div className="mt-4 rounded-md border bg-muted/20 p-4">
								<p className="mb-3 text-sm font-medium">{t("governmentReports.generate.customPeriod")}</p>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="periodStart">{t("governmentReports.generate.periodStart")}</Label>
										<Input id="periodStart" type="date" value={periodStart} onChange={onPeriodStartChange} required />
									</div>
									<div className="space-y-2">
										<Label htmlFor="periodEnd">{t("governmentReports.generate.periodEnd")}</Label>
										<Input id="periodEnd" type="date" value={periodEnd} onChange={onPeriodEndChange} required />
									</div>
								</div>
							</div>
						</section>

						<section className="rounded-md border bg-muted/20 p-4">
							<StepHeader number="3" title={t("governmentReports.generate.createQuestion")} />
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
									{t("governmentReports.generate.createBody")}
								</p>
								<Button type="submit" className="w-full md:w-auto" disabled={generate.isPending}>
									{generate.isPending
										? t("governmentReports.generate.generating")
										: t("governmentReports.generate.submit")}
								</Button>
							</div>
						</section>
					</form>
					{error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("governmentReports.metrics.previewTitle")}</CardTitle>
					<p className="text-sm text-muted-foreground">{t("governmentReports.metrics.previewBody")}</p>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							label={t("governmentReports.metrics.commission")}
							value={summary ? formatCents(summary.money.commissionCents) : isSummaryLoading ? "..." : "0 ETB"}
						/>
						<MetricCard
							label={t("governmentReports.metrics.wages")}
							value={summary ? formatCents(summary.money.wagesCents) : isSummaryLoading ? "..." : "0 ETB"}
						/>
						<MetricCard
							label={t("governmentReports.metrics.placements")}
							value={summary?.counts.placementsStarted ?? (isSummaryLoading ? "..." : 0)}
						/>
						<MetricCard
							label={t("governmentReports.metrics.exceptions")}
							value={
								summary
									? summary.exceptions.workersMissingTin +
										summary.exceptions.businessEmployersMissingTin +
										summary.exceptions.householdEmployersMissingFayda +
										summary.exceptions.commissionPaymentsMissingReference
									: isSummaryLoading
										? "..."
										: 0
							}
							help={t("governmentReports.metrics.exceptionsHelp")}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle className="text-base">{t("governmentReports.table.title")}</CardTitle>
						<p className="text-sm text-muted-foreground">
							{t("governmentReports.table.count", { count: reports?.meta.total ?? 0 })}
						</p>
					</div>
					<Select value={status ?? ALL_FILTER_VALUE} onValueChange={onStatusChange}>
						<SelectTrigger className="w-full md:w-56">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_FILTER_VALUE}>{t("common.any")}</SelectItem>
							{REPORT_STATUSES.map((item) => (
								<SelectItem key={item} value={item}>
									{reportStatusLabel(item, t)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardHeader>
				<CardContent>
					<DataTable<GovernmentReport, unknown>
						columns={columns}
						data={reports?.data ?? []}
						isLoading={isLoading}
						enableSearch={false}
						pageSize={10}
						emptyMessage={t("governmentReports.table.empty")}
					/>
				</CardContent>
			</Card>

			<FilingDialog
				report={filingReport}
				value={filingReference}
				error={filingError}
				isSaving={markFiled.isPending}
				onChange={setFilingReference}
				onClose={onCloseFiling}
				onSubmit={onSubmitFiling}
			/>
		</div>
	);
});
GovernmentReportsPage.displayName = "GovernmentReportsPage";

export const Route = createFileRoute("/staff-admin/government-reports")({
	component: GovernmentReportsPage,
});
