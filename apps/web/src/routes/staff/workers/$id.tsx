import { ContactBookIcon, NoteEditIcon, SecurityIcon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useEmployers } from "#features/employers/api/employer.queries";
import { useCreateHireRequest } from "#features/hire-requests/api/hire-request.queries";
import { type Role, usePublicRoles } from "#features/role-catalog/api/role.queries";
import { usePublicStations } from "#features/stations/api/station.queries";
import { useWorker, type Worker } from "#features/workers/api/worker.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const WorkerDetailPage = React.memo(() => {
	const { t } = useTranslation();
	const { id } = Route.useParams();
	const { data: worker, isLoading } = useWorker(id);

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!worker) return <p className="text-sm text-muted-foreground">{t("workers.profile.notFound")}</p>;

	return (
		<div className="space-y-5">
			<Link to="/staff/workers" className="text-sm text-muted-foreground hover:text-foreground">
				{t("workers.profile.backToWorkers")}
			</Link>

			<StaffProfileHero worker={worker} />

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
				<div className="space-y-5">
					<AgentIdentitySection worker={worker} />
					<AgentRoleSection worker={worker} />
					<AgentHistorySection worker={worker} />
					<AgentVerificationSection worker={worker} />
				</div>
				<aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
					<AgentOperationalPanel worker={worker} />
					<InStationRequestPanel worker={worker} />
				</aside>
			</div>
		</div>
	);
});
WorkerDetailPage.displayName = "WorkerDetailPage";

const StaffProfileHero = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const initials = React.useMemo(() => getInitials(worker.fullName), [worker.fullName]);

	return (
		<section className="overflow-hidden rounded-lg border bg-card">
			<div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
				<div className="flex min-h-56 flex-col items-center justify-center gap-3 bg-muted p-6 text-center">
					<div className="flex size-32 items-center justify-center rounded-full border bg-background text-4xl font-semibold text-primary shadow-sm">
						{initials || <HugeiconsIcon icon={UserMultipleIcon} className="size-12" />}
					</div>
					<p className="text-xs text-muted-foreground">{t("staff.workerPhotoInternal")}</p>
				</div>
				<div className="space-y-5 p-6">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-primary">{t("staff.workerDossier")}</p>
							<h1 className="mt-1 text-3xl font-semibold tracking-tight">{worker.fullName}</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								{worker.area} - {worker.gender === "M" ? t("workers.genderM") : t("workers.genderF")} -{" "}
								{t("workers.expYearsShort", { n: worker.experienceYears })}
							</p>
						</div>
						<div className="flex flex-wrap justify-end gap-2">
							<Badge className="capitalize">{t(`workers.tier.${worker.tier}`)}</Badge>
							<Badge variant={worker.available ? "default" : "secondary"}>
								{worker.available ? t("app.available") : t("workers.busy")}
							</Badge>
							{worker.hopFlag !== "none" && (
								<Badge variant="destructive">{t(`workers.hopFlag.${worker.hopFlag}`)}</Badge>
							)}
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-3">
						<Metric
							icon={SecurityIcon}
							label={t("app.stationReviewed")}
							value={worker.hopFlag === "none" ? t("app.clear") : t("app.reviewRequired")}
						/>
						<Metric
							icon={ContactBookIcon}
							label={t("workers.profile.placements")}
							value={String(worker.placementsCount)}
						/>
						<Metric
							icon={NoteEditIcon}
							label={t("workers.profile.rating")}
							value={worker.ratingAverage ? worker.ratingAverage.toFixed(1) : t("workers.ratingNone")}
						/>
					</div>
				</div>
			</div>
		</section>
	);
});
StaffProfileHero.displayName = "StaffProfileHero";

const AgentIdentitySection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("workers.profile.identityTitle")}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3 md:grid-cols-2">
				<InfoBlock label={t("workers.profile.fayda")} value={worker.fayda} mono />
				<InfoBlock label={t("workers.profile.phone")} value={worker.phone} mono />
				<InfoBlock label={t("workers.filterWoreda")} value={worker.area} />
				<InfoBlock
					label={t("workers.filterMinExperience")}
					value={t("workers.expYearsShort", { n: worker.experienceYears })}
				/>
			</CardContent>
		</Card>
	);
});
AgentIdentitySection.displayName = "AgentIdentitySection";

const AgentRoleSection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const { data: catalog } = usePublicRoles();
	const roleById = React.useMemo(() => new Map((catalog ?? []).map((role) => [role.id, role])), [catalog]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("staff.rolesAndSalary")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 md:grid-cols-2">
					{worker.roles.map((roleId) => (
						<RoleSalaryCard key={roleId} roleId={roleId} role={roleById.get(roleId)} />
					))}
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
				{worker.bio && <p className="text-sm leading-6 text-muted-foreground">{worker.bio}</p>}
			</CardContent>
		</Card>
	);
});
AgentRoleSection.displayName = "AgentRoleSection";

const AgentHistorySection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("app.historyAndTrust")}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3 md:grid-cols-2">
				<InfoBlock
					label={t("app.completedPlacements")}
					value={t("workers.placementsCount", { count: worker.placementsCount })}
				/>
				<InfoBlock
					label={t("app.complaintHistory")}
					value={worker.hopFlag === "none" ? t("app.noVisibleComplaints") : t("app.reviewRequired")}
				/>
				<InfoBlock label={t("app.profileUpdated")} value={new Date(worker.updatedAt).toLocaleDateString()} />
				<InfoBlock label={t("app.availability")} value={worker.available ? t("app.available") : t("workers.busy")} />
			</CardContent>
		</Card>
	);
});
AgentHistorySection.displayName = "AgentHistorySection";

const AgentVerificationSection = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("workers.profile.verificationTitle")}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3 md:grid-cols-2">
				<InfoBlock
					label={t("workers.profile.healthCard")}
					value={worker.hasHealthCard ? t("common.yes") : t("common.no")}
				/>
				<InfoBlock
					label={t("workers.profile.policeClearance")}
					value={worker.hasPoliceClearance ? t("common.yes") : t("common.no")}
				/>
			</CardContent>
		</Card>
	);
});
AgentVerificationSection.displayName = "AgentVerificationSection";

const AgentOperationalPanel = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("staff.agentActions")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<InfoBlock label={t("staff.primaryUse")} value={t("staff.workerProfileUse")} />
				<InfoBlock label={t("app.stationVisit")} value={t("staff.stationVisitAgentBody")} />
				<InfoBlock
					label={t("app.riskSignal")}
					value={worker.hopFlag === "none" ? t("app.clear") : t("app.reviewRequired")}
				/>
			</CardContent>
		</Card>
	);
});
AgentOperationalPanel.displayName = "AgentOperationalPanel";

const InStationRequestPanel = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const create = useCreateHireRequest();
	const { data: stations } = usePublicStations();
	const { data: employersList } = useEmployers({ page: 1, limit: 100 });
	const { data: catalog } = usePublicRoles();
	const [open, setOpen] = React.useState(false);
	const [employerId, setEmployerId] = React.useState("");
	const [roleId, setRoleId] = React.useState(worker.roles[0] ?? "");
	const [salary, setSalary] = React.useState(0);
	const [stationId, setStationId] = React.useState("");
	const [note, setNote] = React.useState("");
	const [error, setError] = React.useState("");
	const selectedRole = React.useMemo(() => catalog?.find((role) => role.id === roleId), [catalog, roleId]);

	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			setError("");
			try {
				await create.mutateAsync({
					workerId: worker.id,
					employerId,
					roleId,
					proposedSalaryCents: salary * 100,
					stationId,
					channel: "in_person",
					note: note || undefined,
				});
				setOpen(false);
				setNote("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[create, employerId, note, roleId, salary, stationId, t, worker.id],
	);

	if (!worker.available) {
		return (
			<Card>
				<CardContent className="pt-6">
					<Button disabled variant="outline" className="w-full">
						{t("workers.busy")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("staff.inStationRequest")}</CardTitle>
			</CardHeader>
			<CardContent>
				{!open ? (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">{t("staff.inStationRequestBody")}</p>
						<Button onClick={() => setOpen(true)} className="w-full">
							{t("staff.startInStationRequest")}
						</Button>
					</div>
				) : (
					<form onSubmit={onSubmit} className="space-y-3">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<FieldSelect
							id="employer"
							label={t("employers.title")}
							value={employerId}
							onChange={setEmployerId}
							options={(employersList?.data ?? []).map((employer) => ({ value: employer.id, label: employer.name }))}
						/>
						<FieldSelect
							id="role"
							label={t("workers.register.roles")}
							value={roleId}
							onChange={setRoleId}
							options={worker.roles.map((role) => ({ value: role, label: role }))}
						/>
						{selectedRole && (
							<p className="text-xs text-muted-foreground">
								{t("app.salaryGuide")}: {formatBirr(selectedRole.salaryMinCents)} -{" "}
								{formatBirr(selectedRole.salaryMaxCents)}
							</p>
						)}
						<div className="space-y-2">
							<Label htmlFor="salary">{t("hireRequests.proposedSalary")}</Label>
							<Input
								id="salary"
								type="number"
								min={0}
								value={salary}
								onChange={(event) => setSalary(Number(event.target.value))}
								required
							/>
						</div>
						<FieldSelect
							id="station"
							label={t("hireRequests.station")}
							value={stationId}
							onChange={setStationId}
							options={(stations ?? []).map((station) => ({ value: station.id, label: station.name }))}
						/>
						<div className="space-y-2">
							<Label htmlFor="note">{t("hireRequests.note")}</Label>
							<textarea
								id="note"
								value={note}
								onChange={(event) => setNote(event.target.value)}
								maxLength={500}
								className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
						<div className="flex gap-2">
							<Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={create.isPending} className="flex-1">
								{create.isPending ? t("common.saving") : t("hireRequests.submit")}
							</Button>
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	);
});
InStationRequestPanel.displayName = "InStationRequestPanel";

const FieldSelect = React.memo(
	({
		id,
		label,
		value,
		onChange,
		options,
	}: {
		readonly id: string;
		readonly label: string;
		readonly value: string;
		readonly onChange: (value: string) => void;
		readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
	}) => (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<select
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				required
				className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
			>
				<option value="">-</option>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	),
);
FieldSelect.displayName = "FieldSelect";

const RoleSalaryCard = React.memo(({ roleId, role }: { readonly roleId: string; readonly role?: Role }) => (
	<div className="rounded-md border p-3">
		<div className="flex flex-wrap items-center justify-between gap-2">
			<p className="text-sm font-medium capitalize">{role?.name ?? roleId}</p>
			<Badge variant="outline">{role?.category ?? roleId}</Badge>
		</div>
		<p className="mt-2 text-sm font-semibold">
			{role ? `${formatBirr(role.salaryMinCents)} - ${formatBirr(role.salaryMaxCents)}` : "-"}
		</p>
	</div>
));
RoleSalaryCard.displayName = "RoleSalaryCard";

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

const InfoBlock = React.memo(
	({ label, value, mono = false }: { readonly label: string; readonly value: string; readonly mono?: boolean }) => (
		<div className="rounded-md bg-muted/50 p-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className={`mt-1 text-sm font-medium ${mono ? "font-mono" : "capitalize"}`}>{value}</p>
		</div>
	),
);
InfoBlock.displayName = "InfoBlock";

const getInitials = (name: string) =>
	name
		.split(" ")
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

const formatBirr = (cents: string) => `${(Number(cents) / 100).toLocaleString()} ETB`;

export const Route = createFileRoute("/staff/workers/$id")({
	component: WorkerDetailPage,
});
