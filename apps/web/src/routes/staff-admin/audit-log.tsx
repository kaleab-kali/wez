import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type AuditEvent,
	type AuditEventFilter,
	auditEventsExportUrl,
	useAuditEvents,
} from "#features/audit-log/api/audit-log.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AUDIT_ACTIONS = [
	"auth.login",
	"auth.logout",
	"auth.failed_login",
	"job.created",
	"job.updated",
	"job.closed",
	"worker.created",
	"worker.profile_updated",
	"employer.signed_up",
	"employer.created",
	"employer.updated",
	"hire_request.created",
	"hire_request.cancelled",
	"referral.created",
	"referral.accepted",
	"referral.declined",
	"referral.deferred",
	"role_catalog.created",
	"role_catalog.updated",
	"lookup.created",
	"lookup.updated",
	"hiring_policy.updated",
	"staff_user.created",
	"staff_user.updated",
	"staff_role.assigned",
	"staff_role.revoked",
	"location.created",
	"location.updated",
	"location.deactivated",
	"station.created",
	"station.updated",
	"station.agent_assigned",
	"station.agent_unassigned",
	"placement.finalized",
	"placement.ended",
	"complaint.created",
	"complaint.mediating",
	"complaint.closed",
	"complaint.referred_external",
	"ticket.created",
	"ticket.assigned",
	"ticket.resolved",
	"ticket.closed",
	"notification.read",
	"notification.preferences_updated",
	"file.upload_signed",
	"file.uploaded",
	"file.finalized",
	"government_report.generated",
	"government_report.filed",
	"permission.denied",
] as const;
const ACTOR_ROLES = [
	"super_admin",
	"ops_manager",
	"compliance_officer",
	"finance_manager",
	"hr_manager",
	"it_manager",
	"training_manager",
	"station_supervisor",
	"agent",
	"support",
	"customer_auth",
	"staff_auth",
	"worker",
	"employer_business",
	"employer_household",
	"system",
	"anonymous",
] as const;
const TARGET_TYPES = [
	"job",
	"worker",
	"employer",
	"hire_request",
	"referral",
	"role_catalog",
	"lookup",
	"hiring_policy",
	"placement",
	"staff_user",
	"staff_role_assignment",
	"location",
	"station",
	"agent_assignment",
	"complaint",
	"ticket",
	"notification",
	"notification_preference",
	"attachment",
	"government_report",
	"permission",
	"auth",
] as const;
const DEFAULT_LIMIT = 25;
const FIRST_PAGE = 1;
const CSV_FILENAME = "wez-audit-events.csv";

const compactId = (value: string | null) => (value && value !== "-" ? `${value.slice(0, 8)}...` : "-");
const formatDateTime = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const metadataValue = (event: AuditEvent, key: string) => {
	const value = event.metadata?.[key];
	return value === null || value === undefined ? "-" : String(value);
};
const formatChangedFields = (event: AuditEvent) => metadataValue(event, "changedFields").replaceAll(",", ", ");
const centsToBirr = (value: string) => {
	const cents = Number(value);
	return Number.isFinite(cents) ? `${(cents / 100).toLocaleString()} ETB` : "-";
};
const actionTitle = (action: string) => {
	if (action === "job.created") return "Job created";
	if (action === "job.updated") return "Job updated";
	if (action === "job.closed") return "Job closed";
	if (action === "placement.finalized") return "Placement finalized";
	if (action === "placement.ended") return "Placement ended";
	if (action === "complaint.created") return "Complaint created";
	if (action === "complaint.mediating") return "Complaint moved to mediation";
	if (action === "complaint.closed") return "Complaint closed";
	if (action === "complaint.referred_external") return "Complaint referred externally";
	if (action === "ticket.created") return "Ticket created";
	if (action === "ticket.assigned") return "Ticket assigned";
	if (action === "ticket.resolved") return "Ticket resolved";
	if (action === "ticket.closed") return "Ticket closed";
	if (action === "notification.read") return "Notification read";
	if (action === "notification.preferences_updated") return "Notification preference updated";
	if (action === "file.upload_signed") return "File upload slot created";
	if (action === "file.uploaded") return "File uploaded";
	if (action === "file.finalized") return "File finalized";
	if (action === "government_report.generated") return "Government report generated";
	if (action === "government_report.filed") return "Government report filed";
	if (action === "permission.denied") return "Permission denied";
	if (action === "auth.login") return "Signed in";
	if (action === "auth.logout") return "Signed out";
	if (action === "auth.failed_login") return "Failed sign-in";
	return action.replaceAll("_", " ").replaceAll(".", " ");
};
const actionSentence = (event: AuditEvent) => {
	if (event.targetType === "auth") {
		const realm = metadataValue(event, "realm");
		const status = metadataValue(event, "statusCode");
		return `${event.actorRole} triggered ${event.action} in ${realm}${status !== "-" ? ` with status ${status}` : ""}.`;
	}
	if (event.targetType === "job") {
		const title =
			metadataValue(event, "afterTitle") !== "-" ? metadataValue(event, "afterTitle") : metadataValue(event, "title");
		if (event.action === "job.created") return `${event.actorRole} created job "${title}".`;
		if (event.action === "job.closed") return `${event.actorRole} closed job "${title}".`;
		return `${event.actorRole} updated job "${title}".`;
	}
	if (event.targetType === "complaint") {
		return `${event.actorRole} updated a ${metadataValue(event, "severity")} ${metadataValue(event, "type")} complaint.`;
	}
	if (event.targetType === "ticket") {
		return `${event.actorRole} updated a ${metadataValue(event, "priority")} ${metadataValue(event, "category")} ticket.`;
	}
	if (event.targetType === "permission") {
		return `${event.actorRole} was denied ${metadataValue(event, "permission")}.`;
	}
	const summary = event.targetSummary;
	if (!summary) return `${event.actorRole} updated a ${event.targetType ?? "record"}.`;
	if (event.action === "placement.finalized") {
		return `${summary.workerName} was placed with ${summary.employerName} as ${summary.roleName}.`;
	}
	if (event.action === "placement.ended") {
		return `${summary.workerName}'s placement with ${summary.employerName} was ended.`;
	}
	return `${summary.workerName} and ${summary.employerName} placement was updated.`;
};

const AuditFilters = React.memo(
	({
		filter,
		onChange,
		onClear,
	}: {
		readonly filter: AuditEventFilter;
		readonly onChange: (patch: AuditEventFilter) => void;
		readonly onClear: () => void;
	}) => {
		const { t } = useTranslation();

		const setValue = React.useCallback(
			(key: keyof AuditEventFilter, value: string) => onChange({ [key]: value, page: FIRST_PAGE }),
			[onChange],
		);

		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("audit.filters")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
						<div className="space-y-2">
							<Label htmlFor="action">{t("audit.action")}</Label>
							<select
								id="action"
								value={filter.action ?? ""}
								onChange={(event) => setValue("action", event.target.value)}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							>
								<option value="">{t("common.any")}</option>
								{AUDIT_ACTIONS.map((action) => (
									<option key={action} value={action}>
										{action}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="actorRole">{t("audit.actorRole")}</Label>
							<select
								id="actorRole"
								value={filter.actorRole ?? ""}
								onChange={(event) => setValue("actorRole", event.target.value)}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							>
								<option value="">{t("common.any")}</option>
								{ACTOR_ROLES.map((role) => (
									<option key={role} value={role}>
										{role}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="targetType">{t("audit.targetType")}</Label>
							<select
								id="targetType"
								value={filter.targetType ?? ""}
								onChange={(event) => setValue("targetType", event.target.value)}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							>
								<option value="">{t("common.any")}</option>
								{TARGET_TYPES.map((targetType) => (
									<option key={targetType} value={targetType}>
										{targetType}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="targetId">{t("audit.targetId")}</Label>
							<Input
								id="targetId"
								value={filter.targetId ?? ""}
								onChange={(event) => setValue("targetId", event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="from">{t("audit.from")}</Label>
							<Input
								id="from"
								type="date"
								value={filter.from ?? ""}
								onChange={(event) => setValue("from", event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="to">{t("audit.to")}</Label>
							<Input
								id="to"
								type="date"
								value={filter.to ?? ""}
								onChange={(event) => setValue("to", event.target.value)}
							/>
						</div>
					</div>
					<div className="mt-4 flex justify-end">
						<Button type="button" variant="outline" onClick={onClear}>
							{t("common.clearFilters")}
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	},
);
AuditFilters.displayName = "AuditFilters";

const TechnicalDetails = React.memo(({ event }: { readonly event: AuditEvent }) => {
	return (
		<div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
			<span>
				Trace request <span className="font-mono">{compactId(metadataValue(event, "correlationId"))}</span>
			</span>
			<span>
				Event <span className="font-mono">{compactId(event.id)}</span>
			</span>
			<span>
				{event.targetType ?? "Target"} <span className="font-mono">{compactId(event.targetId)}</span>
			</span>
		</div>
	);
});
TechnicalDetails.displayName = "TechnicalDetails";

const EventFacts = React.memo(({ event }: { readonly event: AuditEvent }) => {
	if (event.targetType === "job") {
		return (
			<div className="grid gap-3 md:grid-cols-4">
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Changed fields</p>
					<p className="mt-1 truncate font-medium">{formatChangedFields(event)}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Job title</p>
					<p className="mt-1 truncate font-medium">
						{metadataValue(event, "afterTitle") !== "-"
							? metadataValue(event, "afterTitle")
							: metadataValue(event, "title")}
					</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Salary range</p>
					<p className="mt-1 font-medium">
						{centsToBirr(metadataValue(event, "afterSalaryMinCents"))} -{" "}
						{centsToBirr(metadataValue(event, "afterSalaryMaxCents"))}
					</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Status</p>
					<p className="mt-1 font-medium">
						{metadataValue(event, "afterStatus") !== "-"
							? metadataValue(event, "afterStatus")
							: metadataValue(event, "status")}
					</p>
				</div>
			</div>
		);
	}
	if (event.targetType === "complaint") {
		return (
			<div className="grid gap-3 md:grid-cols-4">
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Complaint category</p>
					<p className="mt-1 font-medium">{metadataValue(event, "type")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Severity</p>
					<p className="mt-1 font-medium">{metadataValue(event, "severity")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Status</p>
					<p className="mt-1 font-medium">{metadataValue(event, "status")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Outcome</p>
					<p className="mt-1 font-medium">{metadataValue(event, "resolutionTag")}</p>
				</div>
			</div>
		);
	}
	if (event.targetType === "ticket") {
		return (
			<div className="grid gap-3 md:grid-cols-4">
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Ticket category</p>
					<p className="mt-1 font-medium">{metadataValue(event, "category")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Priority</p>
					<p className="mt-1 font-medium">{metadataValue(event, "priority")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Status</p>
					<p className="mt-1 font-medium">{metadataValue(event, "status")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Assignee</p>
					<p className="mt-1 font-medium">{compactId(metadataValue(event, "assignedToId"))}</p>
				</div>
			</div>
		);
	}
	if (event.targetType === "permission") {
		return (
			<div className="grid gap-3 md:grid-cols-4">
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Permission</p>
					<p className="mt-1 font-medium">{metadataValue(event, "permission")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Method</p>
					<p className="mt-1 font-medium">{metadataValue(event, "method")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Route</p>
					<p className="mt-1 truncate font-medium">{metadataValue(event, "routePath")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Route params</p>
					<p className="mt-1 truncate font-medium">{metadataValue(event, "routeParams")}</p>
				</div>
			</div>
		);
	}
	if (event.targetType === "auth") {
		return (
			<div className="grid gap-3 md:grid-cols-4">
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Auth realm</p>
					<p className="mt-1 font-medium">{metadataValue(event, "realm")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Route</p>
					<p className="mt-1 truncate font-medium">{metadataValue(event, "path")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Method</p>
					<p className="mt-1 font-medium">{metadataValue(event, "method")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Status</p>
					<p className="mt-1 font-medium">{metadataValue(event, "statusCode")}</p>
				</div>
			</div>
		);
	}
	const summary = event.targetSummary;
	if (!summary) {
		return (
			<div className="grid gap-3 md:grid-cols-4">
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Changed fields</p>
					<p className="mt-1 truncate font-medium">{formatChangedFields(event)}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Target type</p>
					<p className="mt-1 font-medium">{event.targetType ?? "-"}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Route params</p>
					<p className="mt-1 truncate font-medium">{metadataValue(event, "routeParams")}</p>
				</div>
				<div className="rounded-md border bg-muted/20 p-3">
					<p className="text-xs text-muted-foreground">Request body</p>
					<p className="mt-1 truncate font-medium">{metadataValue(event, "requestBody")}</p>
				</div>
			</div>
		);
	}
	const salary = centsToBirr(summary?.salaryCents ?? metadataValue(event, "salaryCents"));
	const commission = centsToBirr(summary?.commissionCents ?? metadataValue(event, "commissionCents"));
	const paymentMethod = summary?.paymentMethod ?? metadataValue(event, "paymentMethod");
	const paymentLast4 = summary?.paymentReferenceLast4 ?? metadataValue(event, "paymentReferenceLast4");
	const endedReason = summary?.endedReason ?? metadataValue(event, "endedReason");

	return (
		<div className="grid gap-3 md:grid-cols-4">
			<div className="rounded-md border bg-muted/20 p-3">
				<p className="text-xs text-muted-foreground">Worker salary</p>
				<p className="mt-1 font-medium">{salary}</p>
			</div>
			<div className="rounded-md border bg-muted/20 p-3">
				<p className="text-xs text-muted-foreground">Commission collected</p>
				<p className="mt-1 font-medium">{commission}</p>
			</div>
			<div className="rounded-md border bg-muted/20 p-3">
				<p className="text-xs text-muted-foreground">Payment</p>
				<p className="mt-1 font-medium">
					{paymentMethod}
					{paymentLast4 !== "-" ? ` ending ${paymentLast4}` : ""}
				</p>
			</div>
			<div className="rounded-md border bg-muted/20 p-3">
				<p className="text-xs text-muted-foreground">{event.action === "placement.ended" ? "End reason" : "Station"}</p>
				<p className="mt-1 truncate font-medium">
					{event.action === "placement.ended" ? endedReason : (summary?.stationName ?? "-")}
				</p>
			</div>
		</div>
	);
});
EventFacts.displayName = "EventFacts";

const AuditEventCard = React.memo(({ event }: { readonly event: AuditEvent }) => (
	<div className="space-y-4 border-t p-4 first:border-t-0">
		<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">{event.actorRole}</Badge>
					<span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
				</div>
				<div>
					<h2 className="text-lg font-semibold tracking-tight">{actionTitle(event.action)}</h2>
					<p className="text-sm text-muted-foreground">{actionSentence(event)}</p>
				</div>
			</div>
			<div className="grid min-w-64 gap-1 rounded-md border bg-muted/20 p-3 text-sm">
				<p className="font-medium">
					{event.targetType === "job"
						? metadataValue(event, "afterTitle") !== "-"
							? metadataValue(event, "afterTitle")
							: metadataValue(event, "title")
						: (event.targetSummary?.roleName ?? event.targetType ?? "Record")}
				</p>
				<p className="text-muted-foreground">{event.targetSummary?.stationName ?? "No station recorded"}</p>
				<p className="text-xs text-muted-foreground">{event.action}</p>
			</div>
		</div>
		<EventFacts event={event} />
		<TechnicalDetails event={event} />
	</div>
));
AuditEventCard.displayName = "AuditEventCard";

const AuditEventList = React.memo(
	({ items, isLoading }: { readonly items: AuditEvent[]; readonly isLoading: boolean }) => {
		const { t } = useTranslation();

		if (isLoading) return <p className="p-6 text-sm text-muted-foreground">{t("common.loading")}</p>;
		if (items.length === 0) return <p className="p-6 text-center text-sm text-muted-foreground">{t("audit.empty")}</p>;

		return (
			<div>
				{items.map((event) => (
					<AuditEventCard key={event.id} event={event} />
				))}
			</div>
		);
	},
);
AuditEventList.displayName = "AuditEventList";

const AuditLogPage = React.memo(() => {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<AuditEventFilter>({ page: FIRST_PAGE, limit: DEFAULT_LIMIT });
	const [exportError, setExportError] = React.useState("");
	const [isExporting, setIsExporting] = React.useState(false);
	const { data, isLoading, error } = useAuditEvents(filter);

	const onChange = React.useCallback(
		(patch: AuditEventFilter) => setFilter((current) => ({ ...current, ...patch })),
		[],
	);
	const onClear = React.useCallback(() => setFilter({ page: FIRST_PAGE, limit: DEFAULT_LIMIT }), []);
	const onPrev = React.useCallback(
		() => setFilter((current) => ({ ...current, page: Math.max((current.page ?? FIRST_PAGE) - 1, FIRST_PAGE) })),
		[],
	);
	const onNext = React.useCallback(
		() => setFilter((current) => ({ ...current, page: (current.page ?? FIRST_PAGE) + 1 })),
		[],
	);
	const onExport = React.useCallback(async () => {
		setExportError("");
		setIsExporting(true);
		try {
			const res = await fetch(auditEventsExportUrl(filter), { credentials: "include" });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = CSV_FILENAME;
			anchor.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			setExportError(err instanceof Error ? err.message : t("common.error"));
		} finally {
			setIsExporting(false);
		}
	}, [filter, t]);
	const page = data?.meta.page ?? FIRST_PAGE;
	const totalPages = data?.meta.totalPages ?? FIRST_PAGE;

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">{t("audit.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("audit.subtitle")}</p>
			</div>
			<AuditFilters filter={filter} onChange={onChange} onClear={onClear} />
			{exportError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{exportError}</p>}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<div>
						<CardTitle className="text-base">{t("audit.events")}</CardTitle>
						<p className="text-sm text-muted-foreground">{t("audit.count", { count: data?.meta.total ?? 0 })}</p>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<Button type="button" variant="outline" size="sm" onClick={onExport} disabled={isExporting}>
							{isExporting ? t("audit.exporting") : t("audit.exportCsv")}
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={onPrev} disabled={page <= FIRST_PAGE}>
							{t("common.back")}
						</Button>
						<span className="min-w-20 text-center text-xs text-muted-foreground">
							{page} / {totalPages}
						</span>
						<Button type="button" variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>
							{t("common.next")}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{error && (
						<p className="p-6 text-sm text-destructive">{error instanceof Error ? error.message : t("common.error")}</p>
					)}
					{!error && <AuditEventList items={data?.data ?? []} isLoading={isLoading} />}
				</CardContent>
			</Card>
		</div>
	);
});
AuditLogPage.displayName = "AuditLogPage";

export const Route = createFileRoute("/staff-admin/audit-log")({
	component: AuditLogPage,
});
