import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { type JobInput, useJob, useUpdateJob } from "#features/jobs/api/job.queries";
import { JobForm } from "#features/jobs/components/job-form";
import { authClient } from "#shared/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);

const EditCustomerJobPage = React.memo(() => {
	const { id } = Route.useParams();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const { data: job, isLoading } = useJob(id);
	const updateJob = useUpdateJob(id);
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");

	React.useEffect(() => {
		if (!sessionPending && !isEmployer) navigate({ to: "/app/jobs", replace: true });
	}, [isEmployer, navigate, sessionPending]);

	const onSubmit = React.useCallback(
		async (input: JobInput) => {
			await updateJob.mutateAsync(input);
			navigate({ to: "/app/jobs" });
		},
		[navigate, updateJob],
	);

	return (
		<div className="max-w-3xl space-y-4">
			<Link to="/app/jobs" className="text-sm text-muted-foreground hover:text-foreground">
				&lt;- {t("jobs.title")}
			</Link>
			<Card>
				<CardHeader>
					<CardTitle>{t("jobs.editJob")}</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
					{job && (
						<JobForm
							initialJob={job}
							submitLabel={t("jobs.saveJob")}
							pending={updateJob.isPending}
							roleEditable={false}
							onSubmit={onSubmit}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
});
EditCustomerJobPage.displayName = "EditCustomerJobPage";

export const Route = createFileRoute("/app/jobs/$id/edit")({
	component: EditCustomerJobPage,
});
