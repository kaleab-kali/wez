import {
	Book02Icon,
	Coins01Icon,
	ContactBookIcon,
	NoteEditIcon,
	SecurityIcon,
	StoreLocation02Icon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminDashboardMetrics } from "#features/admin-dashboard/api/admin-dashboard.queries";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TileLink = React.memo(
	({
		to,
		icon,
		title,
		description,
		badge,
	}: {
		readonly to: string;
		readonly icon: typeof StoreLocation02Icon;
		readonly title: string;
		readonly description: string;
		readonly badge?: { label: string; variant: "default" | "destructive" | "secondary" | "outline" };
	}) => (
		<Link to={to} className="block group">
			<Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-sm">
				<CardHeader className="flex flex-row items-start gap-4 space-y-0">
					<div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
						<HugeiconsIcon icon={icon} className="size-5" />
					</div>
					<div className="space-y-1 flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
							{badge && (
								<Badge variant={badge.variant} className="text-[10px]">
									{badge.label}
								</Badge>
							)}
						</div>
						<CardDescription className="text-xs">{description}</CardDescription>
					</div>
				</CardHeader>
			</Card>
		</Link>
	),
	(p, n) => p.to === n.to && p.title === n.title && p.badge?.label === n.badge?.label,
);
TileLink.displayName = "TileLink";

const centsToBirr = (value: string) => {
	const cents = Number(value);
	if (!Number.isFinite(cents)) return "0 ETB";
	return `${Math.round(cents / 100).toLocaleString()} ETB`;
};

const formatCount = (value: number) => value.toLocaleString();

const MetricCard = React.memo(
	({
		label,
		value,
		description,
		tone = "default",
	}: {
		readonly label: string;
		readonly value: string;
		readonly description: string;
		readonly tone?: "default" | "attention" | "success";
	}) => (
		<Card className={tone === "attention" ? "border-amber-300 bg-amber-50/50" : undefined}>
			<CardHeader className="space-y-1 pb-2">
				<CardDescription>{label}</CardDescription>
				<CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-xs text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	),
);
MetricCard.displayName = "MetricCard";

const DashboardSkeleton = React.memo(
	() => (
		<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			{Array.from({ length: 8 }, (_, index) => (
				<Card key={index}>
					<CardHeader className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-8 w-36" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-3 w-full" />
					</CardContent>
				</Card>
			))}
		</div>
	),
	() => true,
);
DashboardSkeleton.displayName = "DashboardSkeleton";

const AdminDashboard = React.memo(() => {
	const { t } = useTranslation();
	const { data: session } = useAdminSession();
	const { data: metrics, isPending: metricsPending, isError: metricsError } = useAdminDashboardMetrics();
	const user = session?.user as { name?: string; role?: string; twoFactorEnabled?: boolean } | undefined;
	const role = user?.role ?? "support";
	const twoFactorEnabled = user?.twoFactorEnabled ?? false;

	return (
		<div className="space-y-8 max-w-6xl">
			<header className="flex items-start justify-between flex-wrap gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{t("admin.consoleTitle")}</h1>
					<p className="text-muted-foreground mt-1.5">{t("admin.welcome", { name: user?.name ?? "" })}</p>
				</div>
				<Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
					{role}
				</Badge>
			</header>

			<section className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						{t("admin.dashboardMetrics")}
					</h2>
					{metricsError && (
						<Badge variant="destructive" className="text-[11px]">
							{t("admin.metricsUnavailable")}
						</Badge>
					)}
				</div>
				{metricsPending && <DashboardSkeleton />}
				{metrics && (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							label={t("admin.metrics.lifetimeCommission")}
							value={centsToBirr(metrics.money.lifetimeCommissionCents)}
							description={t("admin.metrics.lifetimeCommissionDesc")}
						/>
						<MetricCard
							label={t("admin.metrics.activeWages")}
							value={centsToBirr(metrics.money.activeWagesCents)}
							description={t("admin.metrics.activeWagesDesc", {
								count: formatCount(metrics.counts.activePlacements),
							})}
						/>
						<MetricCard
							label={t("admin.metrics.totalPlacements")}
							value={formatCount(metrics.counts.totalPlacements)}
							description={t("admin.metrics.totalPlacementsDesc")}
						/>
						<MetricCard
							label={t("admin.metrics.workers")}
							value={formatCount(metrics.counts.workers)}
							description={t("admin.metrics.workersDesc", {
								count: formatCount(metrics.counts.availableWorkers),
							})}
						/>
						<MetricCard
							label={t("admin.metrics.employers")}
							value={formatCount(metrics.counts.employers)}
							description={t("admin.metrics.employersDesc")}
						/>
						<MetricCard
							label={t("admin.metrics.openComplaints")}
							value={formatCount(metrics.counts.openComplaints)}
							description={t("admin.metrics.openComplaintsDesc")}
							tone={metrics.counts.openComplaints > 0 ? "attention" : "success"}
						/>
						<MetricCard
							label={t("admin.metrics.flaggedWorkers")}
							value={formatCount(metrics.counts.flaggedWorkers)}
							description={t("admin.metrics.flaggedWorkersDesc")}
							tone={metrics.counts.flaggedWorkers > 0 ? "attention" : "success"}
						/>
						<MetricCard
							label={t("admin.metrics.stations")}
							value={formatCount(metrics.counts.stations)}
							description={t("admin.metrics.stationsDesc", {
								count: formatCount(metrics.counts.activeStations),
								tickets: formatCount(metrics.counts.openTickets),
							})}
						/>
					</div>
				)}
			</section>

			<section className="space-y-3">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					{t("admin.operations")}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<TileLink
						to="/staff-admin/staff-users"
						icon={ContactBookIcon}
						title={t("staffUsers.title")}
						description={t("staffUsers.subtitle")}
					/>
					<TileLink
						to="/staff-admin/stations"
						icon={StoreLocation02Icon}
						title={t("admin.stationsAndAgents")}
						description={t("admin.nav.stations")}
					/>
					<TileLink
						to="/staff-admin/locations"
						icon={StoreLocation02Icon}
						title={t("locations.title")}
						description={t("locations.subtitle")}
					/>
					<TileLink
						to="/staff-admin/role-catalog"
						icon={Coins01Icon}
						title={t("admin.roleCatalogLink")}
						description={t("roleCatalog.subtitle")}
					/>
					<TileLink
						to="/staff-admin/hiring-policy"
						icon={NoteEditIcon}
						title={t("platformSettings.hiringPolicy")}
						description={t("platformSettings.hiringPolicyBody")}
					/>
					<TileLink
						to="/staff-admin/lookups"
						icon={Book02Icon}
						title={t("admin.nav.lookups")}
						description="Languages, woredas, religions"
					/>
					<TileLink
						to="/staff-admin/2fa"
						icon={SecurityIcon}
						title={t("admin.twoFactor")}
						description={twoFactorEnabled ? t("admin.manage") : t("admin.enable2fa")}
						badge={
							twoFactorEnabled
								? { label: t("admin.twoFactorEnabled"), variant: "default" }
								: { label: t("admin.twoFactorDisabled"), variant: "destructive" }
						}
					/>
					<TileLink
						to="/staff-admin/sessions"
						icon={UserMultipleIcon}
						title={t("admin.sessions")}
						description={t("admin.viewSessions")}
					/>
				</div>
			</section>
		</div>
	);
});
AdminDashboard.displayName = "AdminDashboard";

export const Route = createFileRoute("/staff-admin/")({
	component: AdminDashboard,
});
