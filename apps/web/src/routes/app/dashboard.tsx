import { Book02Icon, ContactBookIcon, NoteEditIcon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useMyEmployer } from "#features/employers/api/employer.queries";
import type { HireRequest } from "#features/hire-requests/api/hire-request.queries";
import { useHireRequests } from "#features/hire-requests/api/hire-request.queries";
import type { Job } from "#features/jobs/api/job.queries";
import { useJobs } from "#features/jobs/api/job.queries";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";

const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);

type CustomerAdAudience = "employer" | "worker";
type CustomerAppRoute = "/app/workers" | "/app/jobs" | "/app/requests" | "/app/referrals" | "/app/profile";

type DashboardAction = {
	readonly icon: typeof UserMultipleIcon;
	readonly titleKey: string;
	readonly bodyKey: string;
	readonly to: CustomerAppRoute;
	readonly intent?: "primary";
};

type DashboardAd = {
	readonly id: string;
	readonly audiences: readonly CustomerAdAudience[];
	readonly icon: typeof Book02Icon;
	readonly tagKey: string;
	readonly titleKey: string;
	readonly bodyKey: string;
};

const EMPLOYER_ACTIONS: readonly DashboardAction[] = [
	{
		icon: UserMultipleIcon,
		titleKey: "app.actionFindWorkers",
		bodyKey: "app.actionFindWorkersBody",
		to: "/app/workers",
		intent: "primary",
	},
	{
		icon: NoteEditIcon,
		titleKey: "app.actionRequests",
		bodyKey: "app.actionRequestsBody",
		to: "/app/requests",
	},
	{
		icon: ContactBookIcon,
		titleKey: "app.actionReferrals",
		bodyKey: "app.actionReferralsBody",
		to: "/app/referrals",
	},
];

const WORKER_ACTIONS: readonly DashboardAction[] = [
	{
		icon: NoteEditIcon,
		titleKey: "app.actionRequests",
		bodyKey: "app.workerActionRequestsBody",
		to: "/app/requests",
		intent: "primary",
	},
	{
		icon: ContactBookIcon,
		titleKey: "app.actionProfile",
		bodyKey: "app.actionProfileBody",
		to: "/app/profile",
	},
];

const DASHBOARD_ADS: readonly DashboardAd[] = [
	{
		id: "employer-placement-kit",
		audiences: ["employer"],
		icon: ContactBookIcon,
		tagKey: "app.boardEmployerTag",
		titleKey: "app.boardEmployerTitle",
		bodyKey: "app.boardEmployerBody",
	},
	{
		id: "employer-training-package",
		audiences: ["employer"],
		icon: Book02Icon,
		tagKey: "app.boardTrainingTag",
		titleKey: "app.boardEmployerTrainingTitle",
		bodyKey: "app.boardEmployerTrainingBody",
	},
	{
		id: "worker-hospitality-intake",
		audiences: ["worker"],
		icon: Book02Icon,
		tagKey: "app.boardTrainingTag",
		titleKey: "app.boardWorkerTitle",
		bodyKey: "app.boardWorkerBody",
	},
	{
		id: "worker-doc-support",
		audiences: ["worker"],
		icon: NoteEditIcon,
		tagKey: "app.boardSupportTag",
		titleKey: "app.boardWorkerSupportTitle",
		bodyKey: "app.boardWorkerSupportBody",
	},
];

const CustomerDashboard = React.memo(() => {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");
	const adAudience: CustomerAdAudience = isEmployer ? "employer" : "worker";
	const dashboardActions = isEmployer ? EMPLOYER_ACTIONS : WORKER_ACTIONS;
	const { data: employer } = useMyEmployer({ enabled: isEmployer });
	const { data: jobs } = useJobs({ page: 1, limit: 5 }, { enabled: isEmployer });
	const { data: requests } = useHireRequests({ page: 1, limit: 5 }, { enabled: !!role });

	const pendingRequests = React.useMemo(
		() => requests?.data.filter((request) => request.status === "awaiting_visit").length ?? 0,
		[requests],
	);

	return (
		<div className="space-y-8">
			<section className="overflow-hidden rounded-4xl border bg-card shadow-sm">
				<div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
					<div className="space-y-4 p-4 md:space-y-5 md:p-5">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<Badge variant="secondary">
								{isEmployer ? t("app.dashboardEmployerKicker") : t("app.dashboardWorkerKicker")}
							</Badge>
							{isEmployer && employer?.rating && <Badge variant="outline">{employer.rating}</Badge>}
						</div>
						<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_190px] xl:items-end">
							<div className="space-y-2">
								<h1 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
									{employer?.name ?? t("app.dashboardTitle")}
								</h1>
								<p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("app.dashboardBody")}</p>
							</div>
							<div className="rounded-3xl border bg-muted/30 p-3">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									{t("app.dashboardAwaitingVisits")}
								</p>
								<p className="mt-1 font-heading text-2xl font-semibold tabular-nums">{pendingRequests}</p>
							</div>
						</div>
						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{dashboardActions.map((action) => (
								<DashboardActionLink key={action.to} action={action} />
							))}
						</div>
					</div>
					<CustomerAdBoard audience={adAudience} />
				</div>
			</section>

			<section className="overflow-hidden rounded-4xl border bg-card shadow-sm">
				<div className={isEmployer ? "grid lg:grid-cols-2" : ""}>
					{isEmployer && (
						<div className="p-4 md:p-5">
							<RecentJobsPanel jobs={jobs?.data} />
						</div>
					)}
					<div className={isEmployer ? "border-t p-4 md:p-5 lg:border-l lg:border-t-0" : "p-4 md:p-5"}>
						<HireRequestsPanel isEmployer={isEmployer} requests={requests?.data} />
					</div>
				</div>
			</section>
		</div>
	);
});
CustomerDashboard.displayName = "CustomerDashboard";

const RecentJobsPanel = React.memo(({ jobs }: { readonly jobs?: readonly Job[] }) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-base font-semibold">{t("jobs.recent")}</h2>
				<Link to="/app/jobs" className="text-sm font-medium text-primary">
					{t("common.viewAll")}
				</Link>
			</div>
			<div className="space-y-3">
				{jobs?.slice(0, 3).map((job) => (
					<div key={job.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
						<div>
							<p className="text-sm font-medium">{job.title}</p>
							<p className="text-xs text-muted-foreground">{job.roleName ?? job.roleId}</p>
						</div>
						<Badge variant="outline">{t(`jobs.${job.status}`)}</Badge>
					</div>
				))}
				{jobs && jobs.length === 0 && <p className="text-sm text-muted-foreground">{t("jobs.empty")}</p>}
			</div>
		</div>
	);
});
RecentJobsPanel.displayName = "RecentJobsPanel";

const HireRequestsPanel = React.memo(
	({ isEmployer, requests }: { readonly isEmployer: boolean; readonly requests?: readonly HireRequest[] }) => {
		const { t } = useTranslation();

		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-base font-semibold">{t("hireRequests.title")}</h2>
					<Link to="/app/requests" className="text-sm font-medium text-primary">
						{t("common.viewAll")}
					</Link>
				</div>
				<div className="space-y-3">
					{requests?.slice(0, 3).map((request) => (
						<div
							key={request.id}
							className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
						>
							<div>
								<p className="text-sm font-medium">
									{isEmployer
										? (request.workerName ?? request.workerId.slice(0, 8))
										: (request.employerName ?? request.employerId.slice(0, 8))}
								</p>
								<p className="text-xs text-muted-foreground">
									{request.roleName ?? request.roleId}
									{request.stationName ? ` - ${request.stationName}` : ""}
								</p>
							</div>
							<Badge variant="outline">{request.status.replace("_", " ")}</Badge>
						</div>
					))}
					{requests && requests.length === 0 && (
						<p className="text-sm text-muted-foreground">{t("hireRequests.empty")}</p>
					)}
				</div>
			</div>
		);
	},
);
HireRequestsPanel.displayName = "HireRequestsPanel";

const DashboardActionLink = React.memo(({ action }: { readonly action: DashboardAction }) => {
	const { t } = useTranslation();
	const Icon = action.icon;
	const isPrimary = action.intent === "primary";

	return (
		<Link
			to={action.to}
			className={`group flex min-h-24 items-start gap-3 rounded-3xl border p-3 transition md:p-4 ${
				isPrimary
					? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
					: "bg-background hover:border-primary/40 hover:bg-muted/30"
			}`}
		>
			<span
				className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${
					isPrimary ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"
				}`}
			>
				<HugeiconsIcon icon={Icon} className="size-4" />
			</span>
			<span className="min-w-0">
				<span className="block text-sm font-semibold leading-5">{t(action.titleKey)}</span>
				<span
					className={`mt-1 block text-xs leading-5 ${isPrimary ? "text-primary-foreground/80" : "text-muted-foreground"}`}
				>
					{t(action.bodyKey)}
				</span>
			</span>
		</Link>
	);
});
DashboardActionLink.displayName = "DashboardActionLink";

const CustomerAdBoard = React.memo(({ audience }: { readonly audience: CustomerAdAudience }) => {
	const { t } = useTranslation();
	const ads = React.useMemo(() => DASHBOARD_ADS.filter((ad) => ad.audiences.includes(audience)), [audience]);

	return (
		<aside
			aria-label={t("app.boardAriaLabel")}
			className="border-t border-foreground/10 bg-foreground p-4 text-background lg:border-l lg:border-t-0 dark:border-white/20 dark:bg-white dark:text-neutral-950"
		>
			<div className="mb-3 flex items-start justify-between gap-3">
				<div>
					<span className="inline-flex h-5 items-center rounded-3xl border border-background/20 bg-background/10 px-2 text-xs font-medium text-background dark:border-neutral-300 dark:bg-neutral-100 dark:text-neutral-950">
						{t("app.boardLabel")}
					</span>
					<h2 className="mt-2 text-base font-semibold tracking-tight">{t("app.boardTitle")}</h2>
					<p className="mt-1 text-xs leading-5 text-background/70 dark:text-neutral-600">{t("app.boardBody")}</p>
				</div>
			</div>
			<div className="space-y-2">
				{ads.map((ad) => (
					<CustomerAdNotice key={ad.id} ad={ad} />
				))}
			</div>
		</aside>
	);
});
CustomerAdBoard.displayName = "CustomerAdBoard";

const CustomerAdNotice = React.memo(({ ad }: { readonly ad: DashboardAd }) => {
	const { t } = useTranslation();
	const Icon = ad.icon;

	return (
		<article className="rounded-3xl border border-background/15 bg-background/10 p-3 transition hover:border-background/30 dark:border-neutral-200 dark:bg-neutral-100 dark:hover:border-neutral-300">
			<div className="flex items-start gap-3">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-background/15 text-background ring-1 ring-background/20 dark:bg-neutral-950 dark:text-white dark:ring-neutral-950">
					<HugeiconsIcon icon={Icon} className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="mb-1.5 flex flex-wrap items-center gap-2">
						<span className="inline-flex h-5 items-center rounded-3xl border border-background/20 px-2 text-xs font-medium text-background/90 dark:border-neutral-300 dark:text-neutral-700">
							{t(ad.tagKey)}
						</span>
					</div>
					<h2 className="text-sm font-semibold leading-5">{t(ad.titleKey)}</h2>
					<p className="mt-1 text-xs leading-5 text-background/70 dark:text-neutral-600">{t(ad.bodyKey)}</p>
				</div>
			</div>
		</article>
	);
});
CustomerAdNotice.displayName = "CustomerAdNotice";

export const Route = createFileRoute("/app/dashboard")({
	component: CustomerDashboard,
});
