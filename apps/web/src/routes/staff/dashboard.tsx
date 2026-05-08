import { Briefcase02Icon, Edit01Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const QuickAction = React.memo(
	({
		to,
		title,
		description,
		icon,
	}: {
		readonly to: string;
		readonly title: string;
		readonly description: string;
		readonly icon: typeof UserMultipleIcon;
	}) => (
		<Link to={to} className="block group">
			<Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-sm">
				<CardHeader className="flex flex-row items-start gap-4 space-y-0">
					<div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
						<HugeiconsIcon icon={icon} className="size-5" />
					</div>
					<div className="space-y-1 flex-1 min-w-0">
						<CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
						<CardDescription className="text-xs">{description}</CardDescription>
					</div>
				</CardHeader>
			</Card>
		</Link>
	),
	(p, n) => p.to === n.to && p.title === n.title,
);
QuickAction.displayName = "QuickAction";

const DashboardPage = React.memo(() => {
	const { t } = useTranslation();
	const { data: session } = useAdminSession();
	const user = session?.user as { name?: string; role?: string; roles?: string[] } | undefined;
	const role = user?.role ?? "support";
	const name = user?.name ?? "";
	const userRoles = React.useMemo(() => effectiveStaffRoles(role, user?.roles), [role, user?.roles]);
	const canBrowseWorkers = React.useMemo(
		() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.workerEmployerOperations),
		[userRoles],
	);
	const canCreateWorker = React.useMemo(
		() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.workerEmployerCreation),
		[userRoles],
	);
	const canViewPlacements = React.useMemo(
		() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.placementOperations),
		[userRoles],
	);
	const hasQuickActions = canBrowseWorkers || canCreateWorker || canViewPlacements;

	return (
		<div className="space-y-8 max-w-6xl">
			<header className="flex items-start justify-between flex-wrap gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{t("dashboard.welcome")}</h1>
					<p className="text-muted-foreground mt-1.5">{t("dashboard.greeting", { name })}</p>
				</div>
				<Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
					{role}
				</Badge>
			</header>

			{hasQuickActions && (
				<section className="space-y-3">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						{t("dashboard.quickActions")}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{canBrowseWorkers && (
							<QuickAction
								to="/staff/workers"
								title={t("dashboard.browseWorkersTitle")}
								description={t("dashboard.browseWorkersDesc")}
								icon={UserMultipleIcon}
							/>
						)}
						{canCreateWorker && (
							<QuickAction
								to="/staff/workers/new"
								title={t("dashboard.registerWorkerTitle")}
								description={t("dashboard.registerWorkerDesc")}
								icon={Edit01Icon}
							/>
						)}
						{canViewPlacements && (
							<QuickAction
								to="/staff/placements"
								title={t("dashboard.placementsTitle")}
								description={t("dashboard.placementsDesc")}
								icon={Briefcase02Icon}
							/>
						)}
					</div>
				</section>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("dashboard.gettingStarted")}</CardTitle>
					<CardDescription>{t("dashboard.gettingStartedBody")}</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
});
DashboardPage.displayName = "DashboardPage";

export const Route = createFileRoute("/staff/dashboard")({
	component: DashboardPage,
});
