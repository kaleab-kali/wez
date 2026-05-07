import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useEmployers } from "#features/employers/api/employer.queries";
import { type Job, type JobInput, useCreateJob, useJobs } from "#features/jobs/api/job.queries";
import { JobForm } from "#features/jobs/components/job-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const JOB_STATUS_VARIANT: Record<Job["status"], "default" | "secondary" | "outline" | "destructive"> = {
	open: "default",
	closed: "outline",
	filled: "secondary",
};
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const EMPLOYER_LOOKUP_LIMIT = 100;
const CENTS_PER_BIRR = 100;

const formatBirr = (cents: string) => `${(Number(cents) / CENTS_PER_BIRR).toLocaleString()} ETB`;

const StaffJobsPage = React.memo(() => {
	const { t } = useTranslation();
	const [employerId, setEmployerId] = React.useState("");
	const [error, setError] = React.useState("");
	const [formVersion, setFormVersion] = React.useState(0);
	const { data: employers } = useEmployers({ page: DEFAULT_PAGE, limit: EMPLOYER_LOOKUP_LIMIT });
	const { data: jobs, isLoading } = useJobs({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT });
	const createJob = useCreateJob();

	const onEmployerChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setEmployerId(event.target.value);
		setError("");
	}, []);

	const onSubmit = React.useCallback(
		async (input: JobInput) => {
			setError("");
			if (!employerId) {
				setError(t("jobs.selectEmployer"));
				return;
			}
			await createJob.mutateAsync({ ...input, employerId });
			setFormVersion((current) => current + 1);
		},
		[createJob, employerId, t],
	);

	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold tracking-tight">{t("jobs.title")}</h1>
				<p className="text-sm text-muted-foreground">{t("jobs.staffSubtitle")}</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("jobs.createOnBehalf")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
					<div className="max-w-lg space-y-2">
						<Label htmlFor="employer">{t("employers.title")}</Label>
						<select
							id="employer"
							value={employerId}
							onChange={onEmployerChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							<option value="">-</option>
							{employers?.data.map((employer) => (
								<option key={employer.id} value={employer.id}>
									{employer.name}
								</option>
							))}
						</select>
					</div>
					<JobForm
						key={formVersion}
						submitLabel={t("jobs.postJob")}
						pending={createJob.isPending}
						onSubmit={onSubmit}
					/>
				</CardContent>
			</Card>

			<div className="grid gap-3">
				{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
				{jobs?.data.map((job) => (
					<Card key={job.id}>
						<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
							<div>
								<CardTitle className="text-base">{job.title}</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									{job.employerName ?? job.employerId} - {job.roleName ?? job.roleId} - {job.location}
								</p>
							</div>
							<Badge variant={JOB_STATUS_VARIANT[job.status]}>{t(`jobs.${job.status}`)}</Badge>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p>{job.description}</p>
							<p>
								{formatBirr(job.salaryMinCents)} - {formatBirr(job.salaryMaxCents)}
							</p>
						</CardContent>
					</Card>
				))}
				{jobs && jobs.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">{t("jobs.empty")}</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
});
StaffJobsPage.displayName = "StaffJobsPage";

export const Route = createFileRoute("/staff/jobs")({
	component: StaffJobsPage,
});
