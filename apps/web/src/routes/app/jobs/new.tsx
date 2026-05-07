import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { type JobInput, useCreateJob } from "#features/jobs/api/job.queries";
import { JobForm } from "#features/jobs/components/job-form";
import { authClient } from "#shared/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);

const NewCustomerJobPage = React.memo(() => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const createJob = useCreateJob();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");

	React.useEffect(() => {
		if (!sessionPending && !isEmployer) navigate({ to: "/app/jobs", replace: true });
	}, [isEmployer, navigate, sessionPending]);

	const onSubmit = React.useCallback(
		async (input: JobInput) => {
			await createJob.mutateAsync(input);
			navigate({ to: "/app/jobs" });
		},
		[createJob, navigate],
	);

	return (
		<div className="max-w-3xl space-y-4">
			<Link to="/app/jobs" className="text-sm text-muted-foreground hover:text-foreground">
				&lt;- {t("jobs.title")}
			</Link>
			<Card>
				<CardHeader>
					<CardTitle>{t("jobs.postJob")}</CardTitle>
				</CardHeader>
				<CardContent>
					<JobForm submitLabel={t("jobs.postJob")} pending={createJob.isPending} onSubmit={onSubmit} />
				</CardContent>
			</Card>
		</div>
	);
});
NewCustomerJobPage.displayName = "NewCustomerJobPage";

export const Route = createFileRoute("/app/jobs/new")({
	component: NewCustomerJobPage,
});
