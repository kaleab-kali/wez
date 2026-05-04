import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useWorker } from "#features/workers/api/worker.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/workers/$id")({
	component: WorkerDetailPage,
});

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
