import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { type Job, type JobFilter, useCloseJob, useJobs } from "#features/jobs/api/job.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/jobs/")({
	component: CustomerJobsPage,
});

const JOB_STATUS_VARIANT: Record<Job["status"], "default" | "secondary" | "outline" | "destructive"> = {
	open: "default",
	closed: "outline",
	filled: "secondary",
};

const formatBirr = (cents: string) => `${(Number(cents) / 100).toLocaleString()} ETB`;

function CustomerJobsPage() {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<JobFilter>({ page: 1, limit: 20 });
	const { data, isLoading } = useJobs(filter);
	const { data: roles } = usePublicRoles();
	const closeJob = useCloseJob();

	const onRoleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => setFilter({ ...filter, roleId: e.target.value || undefined, page: 1 }),
		[filter],
	);

	const onStatusChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter({ ...filter, status: (e.target.value || undefined) as Job["status"] | undefined, page: 1 }),
		[filter],
	);

	const onClose = React.useCallback((id: string) => closeJob.mutate(id), [closeJob]);

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{t("jobs.title")}</h1>
					<p className="text-sm text-muted-foreground">{t("jobs.subtitle")}</p>
				</div>
				<Button asChild>
					<Link to="/app/jobs/new">{t("jobs.postJob")}</Link>
				</Button>
			</div>

			<Card>
				<CardContent className="grid gap-3 pt-6 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="role">{t("workers.filterRole")}</Label>
						<select
							id="role"
							value={filter.roleId ?? ""}
							onChange={onRoleChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							{roles?.map((role) => (
								<option key={role.id} value={role.id}>
									{role.name}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="status">{t("jobs.status")}</Label>
						<select
							id="status"
							value={filter.status ?? ""}
							onChange={onStatusChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							<option value="open">{t("jobs.statusOpen")}</option>
							<option value="closed">{t("jobs.statusClosed")}</option>
							<option value="filled">{t("jobs.statusFilled")}</option>
						</select>
					</div>
					<div className="flex items-end text-sm text-muted-foreground">
						{isLoading ? t("common.loading") : t("jobs.count", { count: data?.meta.total ?? 0 })}
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-3">
				{data?.data.map((job) => (
					<Card key={job.id}>
						<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
							<div className="min-w-0">
								<CardTitle className="text-base">{job.title}</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									{job.roleName ?? job.roleId} - {job.location} - {formatBirr(job.salaryMinCents)} to{" "}
									{formatBirr(job.salaryMaxCents)}
								</p>
							</div>
							<Badge variant={JOB_STATUS_VARIANT[job.status]}>{t(`jobs.${job.status}`)}</Badge>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-sm text-muted-foreground">{job.description}</p>
							<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
								<span>{t("jobs.posted", { date: new Date(job.postedAt).toLocaleDateString() })}</span>
								{job.status === "open" && (
									<Button variant="outline" size="sm" onClick={() => onClose(job.id)} disabled={closeJob.isPending}>
										{t("jobs.close")}
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				))}
				{data && data.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">{t("jobs.empty")}</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
