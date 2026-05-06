import { Book02Icon, ContactBookIcon, NoteEditIcon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useMyEmployer } from "#features/employers/api/employer.queries";
import { useHireRequests } from "#features/hire-requests/api/hire-request.queries";
import { useJobs } from "#features/jobs/api/job.queries";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SECONDARY_TILES = [{ icon: Book02Icon, titleKey: "app.training", bodyKey: "app.trainingBody" }] as const;
const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);

const CustomerDashboard = React.memo(() => {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");
	const { data: employer } = useMyEmployer({ enabled: isEmployer });
	const { data: jobs } = useJobs({ page: 1, limit: 5, status: isEmployer ? undefined : "open" });
	const { data: requests } = useHireRequests({ page: 1, limit: 5 }, { enabled: isEmployer });

	const pendingRequests = React.useMemo(
		() => requests?.data.filter((request) => request.status === "awaiting_visit").length ?? 0,
		[requests],
	);

	return (
		<div className="space-y-8">
			<section className="flex flex-wrap items-start justify-between gap-4">
				<div className="grid gap-3">
					<p className="text-sm font-medium text-primary">{t("app.shell")}</p>
					<h1 className="max-w-2xl text-3xl font-semibold tracking-tight">
						{employer?.name ?? t("app.dashboardTitle")}
					</h1>
					<p className="max-w-2xl text-muted-foreground">{t("app.dashboardBody")}</p>
				</div>
				{isEmployer ? (
					<Button asChild>
						<Link to="/app/jobs/new">{t("jobs.postJob")}</Link>
					</Button>
				) : (
					<Button asChild>
						<Link to="/app/jobs">{t("jobs.browseJobs")}</Link>
					</Button>
				)}
			</section>

			<section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{isEmployer && (
					<CustomerTile
						icon={ContactBookIcon}
						title={t("app.profile")}
						body={employer ? `${employer.type} - ${employer.area}` : t("app.profileBody")}
						badge={employer?.rating}
					/>
				)}
				{isEmployer ? (
					<CustomerTile
						icon={UserMultipleIcon}
						title={t("app.workers")}
						body={t("app.workersBody")}
						to="/app/workers"
					/>
				) : (
					<CustomerTile icon={NoteEditIcon} title={t("jobs.title")} body={t("jobs.workerCatalogBody")} to="/app/jobs" />
				)}
				<CustomerTile
					icon={NoteEditIcon}
					title={isEmployer ? t("app.requests") : t("placements.title")}
					body={isEmployer ? t("hireRequests.pendingCount", { count: pendingRequests }) : t("placements.workerBody")}
					to={isEmployer ? "/app/requests" : undefined}
				/>
				{isEmployer && (
					<CustomerTile
						icon={ContactBookIcon}
						title={t("referrals.title")}
						body={t("referrals.dashboardBody")}
						to="/app/referrals"
					/>
				)}
				{SECONDARY_TILES.map((tile) => (
					<CustomerTile key={tile.titleKey} icon={tile.icon} title={t(tile.titleKey)} body={t(tile.bodyKey)} />
				))}
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<CardTitle className="text-base">{t("jobs.recent")}</CardTitle>
						<Link to="/app/jobs" className="text-sm text-primary">
							{t("common.viewAll")}
						</Link>
					</CardHeader>
					<CardContent className="space-y-3">
						{jobs?.data.slice(0, 3).map((job) => (
							<div
								key={job.id}
								className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
							>
								<div>
									<p className="text-sm font-medium">{job.title}</p>
									<p className="text-xs text-muted-foreground">{job.roleName ?? job.roleId}</p>
								</div>
								<Badge variant="outline">{t(`jobs.${job.status}`)}</Badge>
							</div>
						))}
						{jobs && jobs.data.length === 0 && <p className="text-sm text-muted-foreground">{t("jobs.empty")}</p>}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<CardTitle className="text-base">{isEmployer ? t("hireRequests.title") : t("placements.title")}</CardTitle>
						{isEmployer && (
							<Link to="/app/requests" className="text-sm text-primary">
								{t("common.viewAll")}
							</Link>
						)}
					</CardHeader>
					<CardContent className="space-y-3">
						{isEmployer &&
							requests?.data.slice(0, 3).map((request) => (
								<div
									key={request.id}
									className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
								>
									<div>
										<p className="text-sm font-medium">{request.workerName ?? request.workerId.slice(0, 8)}</p>
										<p className="text-xs text-muted-foreground">{request.roleName ?? request.roleId}</p>
									</div>
									<Badge variant="outline">{request.status.replace("_", " ")}</Badge>
								</div>
							))}
						{isEmployer && requests && requests.data.length === 0 && (
							<p className="text-sm text-muted-foreground">{t("hireRequests.empty")}</p>
						)}
						{!isEmployer && <p className="text-sm text-muted-foreground">{t("placements.workerBody")}</p>}
					</CardContent>
				</Card>
			</section>
		</div>
	);
});
CustomerDashboard.displayName = "CustomerDashboard";

const CustomerTile = React.memo(
	({
		icon: Icon,
		title,
		body,
		badge,
		to,
	}: {
		readonly icon: typeof UserMultipleIcon;
		readonly title: string;
		readonly body: string;
		readonly badge?: string;
		readonly to?: "/app/workers" | "/app/jobs" | "/app/requests" | "/app/referrals";
	}) => {
		const { t } = useTranslation();
		return (
			<Card className="h-full">
				<CardHeader className="space-y-3">
					<div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
						<HugeiconsIcon icon={Icon} className="size-5" />
					</div>
					<div className="flex items-center justify-between gap-2">
						<CardTitle className="text-base">{title}</CardTitle>
						{badge && <Badge variant="outline">{badge}</Badge>}
					</div>
				</CardHeader>
				<CardContent>
					<CardDescription>{body}</CardDescription>
					{to && (
						<Link to={to} className="mt-3 inline-flex text-sm text-primary">
							{t("common.viewAll")}
						</Link>
					)}
				</CardContent>
			</Card>
		);
	},
);
CustomerTile.displayName = "CustomerTile";

export const Route = createFileRoute("/app/dashboard")({
	component: CustomerDashboard,
});
