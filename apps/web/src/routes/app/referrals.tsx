import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useJobs } from "#features/jobs/api/job.queries";
import {
	type Referral,
	type ReferralStatus,
	useAcceptReferral,
	useDeclineReferral,
	useDeferReferral,
	useReferrals,
} from "#features/referrals/api/referral.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
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

const EmployerReferralsPage = React.memo(() => {
	const { t } = useTranslation();
	const { data } = useReferrals({ page: 1, limit: 30 });
	const { data: roles } = usePublicRoles();
	const { data: jobs } = useJobs({ page: 1, limit: 100 });
	const accept = useAcceptReferral();
	const decline = useDeclineReferral();
	const defer = useDeferReferral();

	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold tracking-tight">{t("referrals.title")}</h1>
				<p className="text-sm text-muted-foreground">{t("referrals.employerSubtitle")}</p>
			</header>

			<div className="grid gap-3">
				{data?.data.map((referral) => (
					<ReferralCard
						key={referral.id}
						referral={referral}
						roles={roles ?? []}
						jobRoleId={jobs?.data.find((job) => job.id === referral.jobId)?.roleId}
						onAccept={accept.mutateAsync}
						onDecline={decline.mutateAsync}
						onDefer={defer.mutateAsync}
						busy={accept.isPending || decline.isPending || defer.isPending}
					/>
				))}
				{data && data.data.length === 0 && (
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
EmployerReferralsPage.displayName = "EmployerReferralsPage";

const ReferralCard = React.memo(
	({
		referral,
		roles,
		jobRoleId,
		onAccept,
		onDecline,
		onDefer,
		busy,
	}: {
		readonly referral: Referral;
		readonly roles: ReadonlyArray<{ id: string; name: string }>;
		readonly jobRoleId?: string;
		readonly onAccept: (input: {
			id: string;
			roleId?: string;
			proposedSalaryCents: number;
			note?: string;
		}) => Promise<Referral>;
		readonly onDecline: (input: { id: string; reason: string }) => Promise<Referral>;
		readonly onDefer: (input: { id: string; days: number }) => Promise<Referral>;
		readonly busy: boolean;
	}) => {
		const { t } = useTranslation();
		const [roleId, setRoleId] = React.useState(jobRoleId ?? "");
		const [salary, setSalary] = React.useState<number | "">("");
		const [note, setNote] = React.useState("");
		const [reason, setReason] = React.useState("");
		const [error, setError] = React.useState("");
		const fieldId = React.useId();
		const pending = referral.status === "pending_employer";

		React.useEffect(() => {
			setRoleId(jobRoleId ?? "");
		}, [jobRoleId]);

		const handleAccept = React.useCallback(async () => {
			setError("");
			if (salary === "" || (!roleId && !jobRoleId)) {
				setError(t("referrals.acceptRequired"));
				return;
			}
			try {
				await onAccept({
					id: referral.id,
					roleId: jobRoleId ? undefined : roleId,
					proposedSalaryCents: Math.round(salary * 100),
					note: note || undefined,
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		}, [jobRoleId, note, onAccept, referral.id, roleId, salary, t]);

		const handleDecline = React.useCallback(async () => {
			setError("");
			if (!reason) {
				setError(t("referrals.declineRequired"));
				return;
			}
			try {
				await onDecline({ id: referral.id, reason });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		}, [onDecline, reason, referral.id, t]);

		const handleDefer = React.useCallback(async () => {
			setError("");
			try {
				await onDefer({ id: referral.id, days: 7 });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		}, [onDefer, referral.id, t]);

		return (
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
					<div>
						<CardTitle className="text-base">{referral.workerName ?? referral.workerId.slice(0, 8)}</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							{referral.jobTitle ?? t("referrals.noJob")} -{" "}
							{t("referrals.expires", {
								date: new Date(referral.expiresAt).toLocaleDateString(),
							})}
						</p>
					</div>
					<Badge variant={STATUS_VARIANT[referral.status]}>{t(`referrals.status.${referral.status}`)}</Badge>
				</CardHeader>
				<CardContent className="space-y-4">
					{referral.note && <p className="text-sm text-muted-foreground">{referral.note}</p>}
					{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
					{pending && (
						<div className="grid gap-3 lg:grid-cols-4">
							<div className="space-y-2">
								<Label htmlFor={`${fieldId}-role`}>{t("workers.filterRole")}</Label>
								<select
									id={`${fieldId}-role`}
									value={roleId}
									onChange={(event) => setRoleId(event.target.value)}
									disabled={!!jobRoleId}
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								>
									<option value="">-</option>
									{roles.map((role) => (
										<option key={role.id} value={role.id}>
											{role.name}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${fieldId}-salary`}>{t("hireRequests.proposedSalary")}</Label>
								<Input
									id={`${fieldId}-salary`}
									type="number"
									value={salary}
									onChange={(event) => setSalary(event.target.value === "" ? "" : Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`${fieldId}-note`}>{t("hireRequests.note")}</Label>
								<Input id={`${fieldId}-note`} value={note} onChange={(event) => setNote(event.target.value)} />
							</div>
							<div className="rounded-md border bg-muted/40 p-3 text-sm lg:col-span-4">
								<p className="font-medium">{t("hireRequests.stationDerivedTitle")}</p>
								<p className="mt-1 text-xs text-muted-foreground">{t("hireRequests.stationDerivedFromWorker")}</p>
							</div>
							<div className="flex items-end gap-2">
								<Button type="button" onClick={handleAccept} disabled={busy}>
									{t("referrals.accept")}
								</Button>
								<Button type="button" variant="outline" onClick={handleDefer} disabled={busy}>
									{t("referrals.defer")}
								</Button>
							</div>
							<div className="space-y-2 lg:col-span-3">
								<Label htmlFor={`${fieldId}-decline-reason`}>{t("referrals.declineReason")}</Label>
								<Input
									id={`${fieldId}-decline-reason`}
									value={reason}
									onChange={(event) => setReason(event.target.value)}
								/>
							</div>
							<div className="flex items-end">
								<Button type="button" variant="outline" onClick={handleDecline} disabled={busy}>
									{t("referrals.decline")}
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		);
	},
);
ReferralCard.displayName = "ReferralCard";

export const Route = createFileRoute("/app/referrals")({
	component: EmployerReferralsPage,
});
