import {
	ContactBookIcon,
	DashboardSquare01Icon,
	NoteEditIcon,
	SecurityIcon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useCreateHireRequest } from "#features/hire-requests/api/hire-request.queries";
import { type Role, usePublicRoles } from "#features/role-catalog/api/role.queries";
import { useWorker, type Worker } from "#features/workers/api/worker.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/workers/$id")({
	component: CustomerWorkerDetailPage,
});

function CustomerWorkerDetailPage() {
	const { t } = useTranslation();
	const { id } = Route.useParams();
	const { data: worker, isLoading } = useWorker(id);

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!worker) return <p className="text-sm text-muted-foreground">{t("workers.profile.notFound")}</p>;

	return (
		<div className="space-y-5">
			<Link to="/app/workers" className="text-sm text-muted-foreground hover:text-foreground">
				{t("workers.profile.backToWorkers")}
			</Link>

			<ProfileHero worker={worker} />

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-5">
					<OverviewSection worker={worker} />
					<ReadinessSection worker={worker} />
					<SkillsSection worker={worker} />
					<HistorySection worker={worker} />
					<VerificationSection worker={worker} />
				</div>
				<aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
					<CandidateSummary worker={worker} />
					<HireRequestPanel worker={worker} />
				</aside>
			</div>
		</div>
	);
}

const ProfileHero = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const initials = React.useMemo(
		() =>
			worker.fullName
				.split(" ")
				.map((part) => part[0])
				.slice(0, 2)
				.join("")
				.toUpperCase(),
		[worker.fullName],
	);

	return (
		<section className="overflow-hidden rounded-lg border bg-card">
			<div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
				<ProfilePhoto initials={initials} />
				<div className="space-y-5 p-6">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm font-medium text-primary">{t("app.candidateProfile")}</p>
							<h1 className="mt-1 text-3xl font-semibold tracking-tight">{worker.fullName}</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								{worker.area} · {worker.gender === "M" ? t("workers.genderM") : t("workers.genderF")} ·{" "}
								{t("workers.expYearsShort", { n: worker.experienceYears })}
							</p>
						</div>
						<div className="flex flex-wrap justify-end gap-2">
							<Badge className="capitalize">{t(`workers.tier.${worker.tier}`)}</Badge>
							<Badge variant={worker.available ? "default" : "secondary"}>
								{worker.available ? t("app.available") : t("workers.busy")}
							</Badge>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-3">
						<Metric
							icon={DashboardSquare01Icon}
							label={t("workers.profile.rating")}
							value={worker.ratingAverage ? worker.ratingAverage.toFixed(1) : t("workers.ratingNone")}
						/>
						<Metric
							icon={ContactBookIcon}
							label={t("workers.profile.placements")}
							value={String(worker.placementsCount)}
						/>
						<Metric
							icon={SecurityIcon}
							label={t("app.riskSignal")}
							value={worker.hopFlag === "none" ? t("app.clear") : t(`workers.hopFlag.${worker.hopFlag}`)}
						/>
					</div>
				</div>
			</div>
		</section>
	);
});
ProfileHero.displayName = "ProfileHero";

const ProfilePhoto = React.memo(({ initials }: { readonly initials: string }) => {
	const { t } = useTranslation();
	return (
		<div className="flex min-h-56 flex-col items-center justify-center gap-3 bg-muted p-6 text-center">
			<div className="flex size-32 items-center justify-center rounded-full border bg-background text-4xl font-semibold text-primary shadow-sm">
				{initials || <HugeiconsIcon icon={UserMultipleIcon} className="size-12" />}
			</div>
			<p className="max-w-36 text-xs text-muted-foreground">{t("app.photoProtectedBody")}</p>
		</div>
	);
});
ProfilePhoto.displayName = "ProfilePhoto";

const Metric = React.memo(
	({
		icon: Icon,
		label,
		value,
	}: {
		readonly icon: typeof UserMultipleIcon;
		readonly label: string;
		readonly value: string;
	}) => (
		<div className="rounded-md border bg-background p-3">
			<div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
				<HugeiconsIcon icon={Icon} className="size-4" />
				{label}
			</div>
			<p className="text-lg font-semibold capitalize">{value}</p>
		</div>
	),
);
Metric.displayName = "Metric";

const OverviewSection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("app.profileOverview")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm leading-6 text-muted-foreground">{worker.bio ?? t("app.noCandidateBio")}</p>
				<div className="grid gap-3 md:grid-cols-3">
					<InfoBlock label={t("workers.filterWoreda")} value={worker.area} />
					<InfoBlock
						label={t("workers.filterGender")}
						value={worker.gender === "M" ? t("workers.genderM") : t("workers.genderF")}
					/>
					<InfoBlock
						label={t("workers.filterMinExperience")}
						value={t("workers.expYearsShort", { n: worker.experienceYears })}
					/>
					<InfoBlock
						label={t("workers.profile.registeredStation")}
						value={worker.registeredAtStationName ?? t("hireRequests.workerStationPending")}
					/>
				</div>
			</CardContent>
		</Card>
	);
});
OverviewSection.displayName = "OverviewSection";

const ReadinessSection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const verifiedCount = React.useMemo(
		() => Number(worker.hasHealthCard) + Number(worker.hasPoliceClearance),
		[worker.hasHealthCard, worker.hasPoliceClearance],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("app.employmentReadiness")}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3 md:grid-cols-2">
				<InfoBlock label={t("app.documents")} value={t("app.verifiedDocs", { count: verifiedCount })} />
				<InfoBlock
					label={t("app.workHistory")}
					value={t("workers.placementsCount", { count: worker.placementsCount })}
				/>
				<InfoBlock label={t("app.languageCoverage")} value={worker.languages.join(", ")} />
				<InfoBlock
					label={t("app.stationReviewed")}
					value={worker.hopFlag === "none" ? t("app.clear") : t(`workers.hopFlag.${worker.hopFlag}`)}
				/>
			</CardContent>
		</Card>
	);
});
ReadinessSection.displayName = "ReadinessSection";

const SkillsSection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const { data: catalog } = usePublicRoles();
	const roleById = React.useMemo(() => new Map((catalog ?? []).map((role) => [role.id, role])), [catalog]);
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("workers.profile.skillsTitle")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<p className="mb-2 text-xs font-medium text-muted-foreground">{t("workers.profile.rolesLabel")}</p>
					<div className="grid gap-2 md:grid-cols-2">
						{worker.roles.map((role) => (
							<RoleSalaryCard key={role} roleId={role} role={roleById.get(role)} />
						))}
					</div>
				</div>
				<div>
					<p className="mb-2 text-xs font-medium text-muted-foreground">{t("workers.profile.languagesLabel")}</p>
					<div className="flex flex-wrap gap-2">
						{worker.languages.map((language) => (
							<Badge key={language} variant="outline">
								{language}
							</Badge>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
});
SkillsSection.displayName = "SkillsSection";

const RoleSalaryCard = React.memo(({ roleId, role }: { readonly roleId: string; readonly role?: Role }) => {
	const { t } = useTranslation();
	return (
		<div className="rounded-md border p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-sm font-medium capitalize">{role?.name ?? roleId}</p>
				<Badge variant="outline">{role?.category ?? roleId}</Badge>
			</div>
			<p className="mt-2 text-xs text-muted-foreground">{t("app.salaryGuide")}</p>
			<p className="mt-1 text-sm font-semibold">
				{role ? `${formatBirr(role.salaryMinCents)} - ${formatBirr(role.salaryMaxCents)}` : t("common.loading")}
			</p>
		</div>
	);
});
RoleSalaryCard.displayName = "RoleSalaryCard";

const HistorySection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const historyItems = React.useMemo(
		() => [
			{
				label: t("app.completedPlacements"),
				value: t("workers.placementsCount", { count: worker.placementsCount }),
				body: worker.placementsCount > 0 ? t("app.historyPlacementsBody") : t("app.historyNoPlacementsBody"),
			},
			{
				label: t("app.complaintHistory"),
				value: worker.hopFlag === "none" ? t("app.noVisibleComplaints") : t("app.reviewRequired"),
				body: worker.hopFlag === "none" ? t("app.complaintsClearBody") : t("app.complaintsReviewBody"),
			},
			{
				label: t("app.profileUpdated"),
				value: new Date(worker.updatedAt).toLocaleDateString(),
				body: t("app.profileUpdatedBody"),
			},
		],
		[t, worker.hopFlag, worker.placementsCount, worker.updatedAt],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("app.historyAndTrust")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{historyItems.map((item) => (
					<div key={item.label} className="rounded-md border p-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-sm font-medium">{item.label}</p>
							<Badge variant="outline">{item.value}</Badge>
						</div>
						<p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
					</div>
				))}
			</CardContent>
		</Card>
	);
});
HistorySection.displayName = "HistorySection";

const VerificationSection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("workers.profile.verificationTitle")}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3 md:grid-cols-2">
				<VerificationItem label={t("workers.profile.healthCard")} ok={worker.hasHealthCard} />
				<VerificationItem label={t("workers.profile.policeClearance")} ok={worker.hasPoliceClearance} />
			</CardContent>
		</Card>
	);
});
VerificationSection.displayName = "VerificationSection";

const VerificationItem = React.memo(({ label, ok }: { readonly label: string; readonly ok: boolean }) => {
	const { t } = useTranslation();
	return (
		<div className="flex items-center gap-3 rounded-md border p-4">
			<HugeiconsIcon icon={SecurityIcon} className={`size-5 ${ok ? "text-primary" : "text-muted-foreground"}`} />
			<div>
				<p className="text-sm font-medium">{label}</p>
				<p className="text-xs text-muted-foreground">{ok ? t("common.yes") : t("common.no")}</p>
			</div>
		</div>
	);
});
VerificationItem.displayName = "VerificationItem";

const CandidateSummary = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("app.matchSummary")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<InfoBlock label={t("app.bestFor")} value={worker.roles.join(", ")} />
				<InfoBlock label={t("app.availability")} value={worker.available ? t("app.available") : t("workers.busy")} />
				<InfoBlock
					label={t("app.stationVisit")}
					value={worker.registeredAtStationName ?? t("hireRequests.workerStationPending")}
				/>
			</CardContent>
		</Card>
	);
});
CandidateSummary.displayName = "CandidateSummary";

const InfoBlock = React.memo(({ label, value }: { readonly label: string; readonly value: string }) => (
	<div className="rounded-md bg-muted/50 p-3">
		<p className="text-xs text-muted-foreground">{label}</p>
		<p className="mt-1 text-sm font-medium capitalize">{value}</p>
	</div>
));
InfoBlock.displayName = "InfoBlock";

const formatBirr = (cents: string) => `${(Number(cents) / 100).toLocaleString()} ETB`;

const HireRequestPanel = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const create = useCreateHireRequest();
	const { data: catalog } = usePublicRoles();
	const [roleId, setRoleId] = React.useState(worker.roles[0] ?? "");
	const [salary, setSalary] = React.useState<number | "">("");
	const [note, setNote] = React.useState("");
	const [success, setSuccess] = React.useState(false);
	const [error, setError] = React.useState("");
	const selectedRole = React.useMemo(() => catalog?.find((role) => role.id === roleId), [catalog, roleId]);
	const salaryMin = React.useMemo(() => (selectedRole ? Number(selectedRole.salaryMinCents) / 100 : 0), [selectedRole]);
	const salaryMax = React.useMemo(() => (selectedRole ? Number(selectedRole.salaryMaxCents) / 100 : 0), [selectedRole]);
	const salaryInvalid = React.useMemo(
		() => salary === "" || (selectedRole ? salary < salaryMin || salary > salaryMax : false),
		[salary, salaryMax, salaryMin, selectedRole],
	);

	React.useEffect(() => {
		if (selectedRole) setSalary(Number(selectedRole.salaryMinCents) / 100);
	}, [selectedRole]);

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			setSuccess(false);
			if (salaryInvalid || salary === "") {
				setError(t("hireRequests.salaryRangeRequired", { min: salaryMin, max: salaryMax }));
				return;
			}
			if (!worker.registeredAtStationId) {
				setError(t("hireRequests.workerStationMissing"));
				return;
			}
			try {
				await create.mutateAsync({
					workerId: worker.id,
					roleId,
					proposedSalaryCents: Math.round(salary * 100),
					channel: "online",
					note: note || undefined,
				});
				setSuccess(true);
				setNote("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[create, note, roleId, salary, salaryInvalid, salaryMax, salaryMin, t, worker.id, worker.registeredAtStationId],
	);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<HugeiconsIcon icon={NoteEditIcon} className="size-5 text-primary" />
					<CardTitle className="text-base">{t("hireRequests.create")}</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{!worker.available ? (
					<p className="text-sm text-muted-foreground">{t("app.workerUnavailableBody")}</p>
				) : (
					<form onSubmit={onSubmit} className="space-y-3">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						{success && (
							<div className="rounded-md bg-primary/10 p-3 text-sm text-primary">{t("hireRequests.created")}</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="role">{t("workers.register.roles")}</Label>
							<select
								id="role"
								value={roleId}
								onChange={(e) => setRoleId(e.target.value)}
								required
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								{worker.roles.map((role) => (
									<option key={role} value={role}>
										{role}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="salary">{t("hireRequests.proposedSalary")}</Label>
							<Input
								id="salary"
								type="number"
								min={salaryMin}
								max={salaryMax || undefined}
								value={salary}
								onChange={(e) => setSalary(e.target.value === "" ? "" : Number(e.target.value))}
								required
							/>
							{selectedRole && (
								<p className="text-xs text-muted-foreground">
									{t("jobs.roleRange", { min: salaryMin.toLocaleString(), max: salaryMax.toLocaleString() })}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label>{t("hireRequests.station")}</Label>
							<div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
								<p className="font-medium">
									{worker.registeredAtStationName ?? t("hireRequests.workerStationPending")}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">{t("hireRequests.stationDerivedFromWorker")}</p>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="note">{t("hireRequests.note")}</Label>
							<textarea
								id="note"
								value={note}
								onChange={(e) => setNote(e.target.value)}
								className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
						<Button type="submit" className="w-full" disabled={create.isPending || salaryInvalid}>
							{create.isPending ? t("common.saving") : t("hireRequests.submit")}
						</Button>
					</form>
				)}
			</CardContent>
		</Card>
	);
});
HireRequestPanel.displayName = "HireRequestPanel";
