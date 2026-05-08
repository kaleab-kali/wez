import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useEmployers } from "#features/employers/api/employer.queries";
import { useJobs } from "#features/jobs/api/job.queries";
import { type ReferralStatus, useCreateReferral, useReferrals } from "#features/referrals/api/referral.queries";
import { useWorkers } from "#features/workers/api/worker.queries";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_VARIANT: Record<ReferralStatus, "default" | "secondary" | "outline" | "destructive"> = {
	pending_employer: "default",
	converted: "secondary",
	declined: "outline",
	expired: "destructive",
};

const StaffReferralsPage = React.memo(() => {
	const { t } = useTranslation();
	const [workerId, setWorkerId] = React.useState("");
	const [employerId, setEmployerId] = React.useState("");
	const [jobId, setJobId] = React.useState("");
	const [note, setNote] = React.useState("");
	const [error, setError] = React.useState("");
	const { data: session } = useAdminSession();
	const user = session?.user as { role?: string; roles?: string[] } | undefined;
	const userRoles = React.useMemo(() => effectiveStaffRoles(user?.role, user?.roles), [user?.role, user?.roles]);
	const canCreateReferral = React.useMemo(
		() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.referralCreation),
		[userRoles],
	);
	const { data: referrals } = useReferrals({ page: 1, limit: 30 });
	const { data: workers } = useWorkers({ page: 1, limit: 100, availableOnly: true, hideFlagged: true });
	const { data: employers } = useEmployers({ page: 1, limit: 100 });
	const { data: jobs } = useJobs({ page: 1, limit: 100, status: "open", employerId: employerId || undefined });
	const createReferral = useCreateReferral();

	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			setError("");
			try {
				await createReferral.mutateAsync({
					workerId,
					employerId,
					jobId: jobId || undefined,
					note: note || undefined,
				});
				setWorkerId("");
				setEmployerId("");
				setJobId("");
				setNote("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[createReferral, employerId, jobId, note, t, workerId],
	);

	return (
		<div className="space-y-6 max-w-6xl">
			<header>
				<h1 className="text-2xl font-semibold tracking-tight">{t("referrals.title")}</h1>
				<p className="text-sm text-muted-foreground">{t("referrals.staffSubtitle")}</p>
			</header>

			{canCreateReferral && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("referrals.create")}</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-4">
							{error && (
								<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive lg:col-span-4">{error}</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="worker">{t("workers.title")}</Label>
								<select
									id="worker"
									value={workerId}
									onChange={(event) => setWorkerId(event.target.value)}
									required
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								>
									<option value="">-</option>
									{workers?.data.map((worker) => (
										<option key={worker.id} value={worker.id}>
											{worker.fullName}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="employer">{t("employers.title")}</Label>
								<select
									id="employer"
									value={employerId}
									onChange={(event) => {
										setEmployerId(event.target.value);
										setJobId("");
									}}
									required
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
							<div className="space-y-2">
								<Label htmlFor="job">{t("jobs.title")}</Label>
								<select
									id="job"
									value={jobId}
									onChange={(event) => setJobId(event.target.value)}
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								>
									<option value="">{t("common.none")}</option>
									{jobs?.data.map((job) => (
										<option key={job.id} value={job.id}>
											{job.title}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="note">{t("hireRequests.note")}</Label>
								<Input id="note" value={note} onChange={(event) => setNote(event.target.value)} />
							</div>
							<div className="lg:col-span-4">
								<Button type="submit" disabled={createReferral.isPending}>
									{createReferral.isPending ? t("common.saving") : t("referrals.create")}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-3">
				{referrals?.data.map((referral) => (
					<Card key={referral.id}>
						<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
							<div>
								<CardTitle className="text-base">
									{referral.workerName ?? referral.workerId.slice(0, 8)} {"->"}{" "}
									{referral.employerName ?? referral.employerId.slice(0, 8)}
								</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									{referral.jobTitle ?? t("referrals.noJob")} -{" "}
									{t("referrals.expires", {
										date: new Date(referral.expiresAt).toLocaleDateString(),
									})}
								</p>
							</div>
							<Badge variant={STATUS_VARIANT[referral.status]}>{t(`referrals.status.${referral.status}`)}</Badge>
						</CardHeader>
						{referral.note && (
							<CardContent>
								<p className="text-sm text-muted-foreground">{referral.note}</p>
							</CardContent>
						)}
					</Card>
				))}
				{referrals && referrals.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">
							{t("referrals.empty")}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
});
StaffReferralsPage.displayName = "StaffReferralsPage";

export const Route = createFileRoute("/staff/referrals")({
	component: StaffReferralsPage,
});
