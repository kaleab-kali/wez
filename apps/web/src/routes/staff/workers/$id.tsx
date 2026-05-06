import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useEmployers } from "#features/employers/api/employer.queries";
import { useCreateHireRequest } from "#features/hire-requests/api/hire-request.queries";
import { usePublicStations } from "#features/stations/api/station.queries";
import { useWorker } from "#features/workers/api/worker.queries";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/staff/workers/$id")({
	component: WorkerDetailPage,
});

const HireRequestForm = React.memo(
	({ workerId, workerRoles, available }: { readonly workerId: string; readonly workerRoles: string[]; readonly available: boolean }) => {
		const { t } = useTranslation();
		const { data: session } = authClient.useSession();
		const role = (session?.user as { role?: string } | undefined)?.role;
		const isAgent = role === "agent" || role === "station_supervisor";

		const create = useCreateHireRequest();
		const { data: stations } = usePublicStations();
		const { data: employersList } = useEmployers({ page: 1, limit: 100 });

		const [employerId, setEmployerId] = React.useState("");
		const [roleId, setRoleId] = React.useState(workerRoles[0] ?? "");
		const [salary, setSalary] = React.useState(0);
		const [stationId, setStationId] = React.useState("");
		const [note, setNote] = React.useState("");
		const [error, setError] = React.useState("");
		const [open, setOpen] = React.useState(false);

		const onSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				try {
					await create.mutateAsync({
						workerId,
						employerId: isAgent ? employerId : undefined,
						roleId,
						proposedSalaryCents: salary * 100,
						stationId,
						channel: isAgent ? "in_person" : "online",
						note: note || undefined,
					});
					setOpen(false);
				} catch (err) {
					setError(err instanceof Error ? err.message : "Could not create");
				}
			},
			[create, workerId, isAgent, employerId, roleId, salary, stationId, note],
		);

		if (!available) {
			return (
				<Button disabled variant="outline">
					Worker busy
				</Button>
			);
		}

		if (!open) {
			return <Button onClick={() => setOpen(true)}>{t("hireRequests.create")}</Button>;
		}

		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="text-base">{t("hireRequests.create")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-3">
						{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
						{isAgent && (
							<div className="space-y-2">
								<Label htmlFor="emp">Employer</Label>
								<select
									id="emp"
									value={employerId}
									onChange={(e) => setEmployerId(e.target.value)}
									required
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="">—</option>
									{employersList?.data.map((em) => (
										<option key={em.id} value={em.id}>
											{em.name}
										</option>
									))}
								</select>
							</div>
						)}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor="role">{t("workers.register.roles")}</Label>
								<select
									id="role"
									value={roleId}
									onChange={(e) => setRoleId(e.target.value)}
									required
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									{workerRoles.map((r) => (
										<option key={r} value={r}>
											{r}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="sal">{t("hireRequests.proposedSalary")}</Label>
								<Input
									id="sal"
									type="number"
									min={0}
									value={salary}
									onChange={(e) => setSalary(Number(e.target.value))}
									required
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="station">{t("hireRequests.station")}</Label>
							<select
								id="station"
								value={stationId}
								onChange={(e) => setStationId(e.target.value)}
								required
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">—</option>
								{stations?.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="note">{t("hireRequests.note")}</Label>
							<textarea
								id="note"
								value={note}
								onChange={(e) => setNote(e.target.value)}
								maxLength={500}
								className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
						<div className="flex justify-between">
							<Button type="button" variant="outline" onClick={() => setOpen(false)}>
								{t("common.cancel")}
							</Button>
							<Button type="submit" disabled={create.isPending}>
								{create.isPending ? t("common.saving") : t("hireRequests.submit")}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		);
	},
	(p, n) => p.workerId === n.workerId && p.available === n.available,
);
HireRequestForm.displayName = "HireRequestForm";

function WorkerDetailPage() {
	const { t } = useTranslation();
	const { id } = Route.useParams();
	const { data, isLoading } = useWorker(id);

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!data) return <p className="text-sm text-muted-foreground">{t("workers.profile.notFound")}</p>;

	const w = data;
	const initials = w.fullName
		.split(" ")
		.map((p) => p[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<div className="max-w-3xl space-y-4">
			<div>
				<Link to="/workers" className="text-sm text-muted-foreground hover:text-foreground transition">
					&larr; {t("workers.profile.backToWorkers")}
				</Link>
				<div className="mt-3 flex items-start justify-between flex-wrap gap-3">
					<div className="flex items-start gap-4">
						<div className="size-14 rounded-full bg-primary/10 text-primary text-lg font-bold flex items-center justify-center">
							{initials}
						</div>
						<div>
							<h1 className="text-2xl font-bold tracking-tight">{w.fullName}</h1>
							<p className="text-sm text-muted-foreground mt-1">
								{w.area} · {w.gender === "M" ? t("workers.genderM") : t("workers.genderF")} ·{" "}
								{t("workers.expYearsShort", { n: w.experienceYears })}
							</p>
						</div>
					</div>
					<div className="flex flex-col items-end gap-1">
						<Badge className="capitalize">{w.tier}</Badge>
						{w.hopFlag !== "none" && <Badge variant="destructive" className="capitalize">{w.hopFlag}</Badge>}
						{!w.available && <Badge variant="secondary">{t("workers.busy")}</Badge>}
					</div>
				</div>
			</div>

			<HireRequestForm workerId={w.id} workerRoles={w.roles} available={w.available} />

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("workers.profile.identityTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 text-sm gap-3">
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.profile.fayda")}</p>
						<p className="font-mono">{w.fayda}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.profile.phone")}</p>
						<p className="font-mono">{w.phone}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("workers.profile.skillsTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div>
						<p className="text-muted-foreground text-xs mb-1">{t("workers.profile.rolesLabel")}</p>
						<div className="flex flex-wrap gap-1">
							{w.roles.map((r) => (
								<Badge key={r} variant="outline">
									{r}
								</Badge>
							))}
						</div>
					</div>
					<div>
						<p className="text-muted-foreground text-xs mb-1">{t("workers.profile.languagesLabel")}</p>
						<div className="flex flex-wrap gap-1">
							{w.languages.map((l) => (
								<Badge key={l} variant="outline">
									{l}
								</Badge>
							))}
						</div>
					</div>
					{w.bio && (
						<div>
							<p className="text-muted-foreground text-xs mb-1">{t("workers.profile.bioLabel")}</p>
							<p>{w.bio}</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("workers.profile.verificationTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.profile.healthCard")}</p>
						<p>{w.hasHealthCard ? t("common.yes") : t("common.no")}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.profile.policeClearance")}</p>
						<p>{w.hasPoliceClearance ? t("common.yes") : t("common.no")}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("workers.profile.statsTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-3 gap-3 text-sm">
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.profile.rating")}</p>
						<p className="font-mono text-lg">{w.ratingAverage !== null ? w.ratingAverage.toFixed(1) : "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.profile.placements")}</p>
						<p className="font-mono text-lg">{w.placementsCount}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.profile.tier")}</p>
						<p className="font-mono text-lg capitalize">{w.tier}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
