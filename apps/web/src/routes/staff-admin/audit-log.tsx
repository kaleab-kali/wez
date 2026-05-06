import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { type AuditEvent, type AuditEventFilter, useAuditEvents } from "#features/audit-log/api/audit-log.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AUDIT_ACTIONS = ["placement.finalized", "placement.ended"] as const;
const ACTOR_ROLES = ["super_admin", "ops_manager", "compliance_officer", "finance_manager", "agent"] as const;
const TARGET_TYPES = ["placement"] as const;
const DEFAULT_LIMIT = 25;
const FIRST_PAGE = 1;

const compactId = (value: string | null) => (value && value !== "-" ? `${value.slice(0, 8)}...` : "-");
const formatDateTime = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const metadataValue = (event: AuditEvent, key: string) => {
	const value = event.metadata?.[key];
	return value === null || value === undefined ? "-" : String(value);
};
const centsToBirr = (value: string) => {
	const cents = Number(value);
	return Number.isFinite(cents) ? `${(cents / 100).toLocaleString()} ETB` : "-";
};
const actionTitle = (action: string) => {
	if (action === "placement.finalized") return "Placement finalized";
	if (action === "placement.ended") return "Placement ended";
	return action;
};
const actionSentence = (event: AuditEvent) => {
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
				Placement <span className="font-mono">{compactId(event.targetId)}</span>
			</span>
		</div>
	);
});
TechnicalDetails.displayName = "TechnicalDetails";

const EventFacts = React.memo(({ event }: { readonly event: AuditEvent }) => {
	const summary = event.targetSummary;
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
				<p className="font-medium">{event.targetSummary?.roleName ?? event.targetType ?? "Record"}</p>
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
	const page = data?.meta.page ?? FIRST_PAGE;
	const totalPages = data?.meta.totalPages ?? FIRST_PAGE;

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">{t("audit.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("audit.subtitle")}</p>
			</div>
			<AuditFilters filter={filter} onChange={onChange} onClear={onClear} />
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<div>
						<CardTitle className="text-base">{t("audit.events")}</CardTitle>
						<p className="text-sm text-muted-foreground">{t("audit.count", { count: data?.meta.total ?? 0 })}</p>
					</div>
					<div className="flex items-center gap-2">
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
