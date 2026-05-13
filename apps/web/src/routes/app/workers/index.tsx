import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLookupKind } from "#features/lookups/api/lookup.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { useWorkers, type Worker, type WorkerFilter } from "#features/workers/api/worker.queries";
import { WorkerProfilePhoto } from "#features/workers/components/WorkerProfilePhoto";
import { LocationHierarchySelect, type LocationHierarchySelection } from "#shared/components/LocationHierarchySelect";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/workers/")({
	component: CustomerWorkersPage,
});

const TIER_VARIANT: Record<Worker["tier"], "default" | "secondary" | "outline"> = {
	basic: "outline",
	verified: "secondary",
	trained: "default",
	trusted: "default",
};

const formatRoleId = (roleId: string) =>
	roleId
		.split("_")
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ");

const CustomerWorkerCard = React.memo(({ worker }: { readonly worker: Worker }) => {
	const { t } = useTranslation();
	const primaryRole = worker.roles[0] ? formatRoleId(worker.roles[0]) : t("workers.profile.skillsTitle");
	const stationLabel = worker.registeredAtStationName ?? t("hireRequests.workerStationPending");
	const ratingLabel = worker.ratingAverage !== null ? worker.ratingAverage.toFixed(1) : t("workers.ratingNone");

	return (
		<Link to="/app/workers/$id" params={{ id: worker.id }} className="block group">
			<Card className="h-full overflow-hidden transition group-hover:border-primary/40 group-hover:shadow-sm">
				<CardContent className="p-4">
					<div className="flex min-w-0 items-start gap-4">
						<WorkerProfilePhoto worker={worker} className="size-16 shrink-0 text-xl sm:size-20 sm:text-2xl" />
						<div className="min-w-0 flex-1 space-y-2">
							<div className="min-w-0">
								<CardTitle className="text-base leading-snug break-words [overflow-wrap:anywhere]">
									{worker.fullName}
								</CardTitle>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
									{primaryRole} / {worker.gender === "M" ? t("workers.genderM") : t("workers.genderF")} /{" "}
									{t("workers.expYearsShort", { n: worker.experienceYears })}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-1.5">
								<Badge variant={TIER_VARIANT[worker.tier]}>{worker.tier}</Badge>
								<Badge variant="outline" className="font-normal">
									{t("workers.ratingLabel")}: {ratingLabel}
								</Badge>
								{!worker.available && (
									<Badge variant="secondary" className="font-normal">
										{t("workers.busy")}
									</Badge>
								)}
							</div>
							<p className="text-xs leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
								{t("hireRequests.station")}: {stationLabel}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
});
CustomerWorkerCard.displayName = "CustomerWorkerCard";

function CustomerWorkersPage() {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<WorkerFilter>({
		page: 1,
		limit: 20,
		availableOnly: true,
		hideFlagged: true,
	});
	const { data, isLoading } = useWorkers(filter);
	const { data: roles } = usePublicRoles();
	const { data: languages } = useLookupKind("languages");

	const locationValue = React.useMemo<LocationHierarchySelection>(
		() => ({
			adminAreaId: filter.adminAreaId,
			subAreaId: filter.subAreaId,
			localityId: filter.localityId,
		}),
		[filter.adminAreaId, filter.localityId, filter.subAreaId],
	);

	const updateFilter = React.useCallback(
		(patch: Partial<WorkerFilter>) => setFilter((current) => ({ ...current, ...patch, page: 1 })),
		[],
	);

	const set = React.useCallback(
		<K extends keyof WorkerFilter>(key: K, value: WorkerFilter[K]) => updateFilter({ [key]: value }),
		[updateFilter],
	);

	const onLocationChange = React.useCallback(
		(next: LocationHierarchySelection) => {
			updateFilter({
				adminAreaId: next.adminAreaId,
				subAreaId: next.subAreaId,
				localityId: next.localityId,
				woreda: undefined,
			});
		},
		[updateFilter],
	);

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{t("app.workers")}</h1>
				<p className="text-sm text-muted-foreground">{t("app.workersBrowseBody")}</p>
			</div>

			<Card>
				<CardContent className="grid gap-3 pt-6 lg:grid-cols-4">
					<div className="space-y-2">
						<Label htmlFor="q">{t("common.search")}</Label>
						<Input
							id="q"
							value={filter.q ?? ""}
							onChange={(e) => set("q", e.target.value || undefined)}
							placeholder={t("workers.filterSearchPlaceholder")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="role">{t("workers.filterRole")}</Label>
						<select
							id="role"
							value={filter.roleId ?? ""}
							onChange={(e) => set("roleId", e.target.value || undefined)}
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
					<div className="lg:col-span-2">
						<LocationHierarchySelect
							idPrefix="worker-location-filter"
							value={locationValue}
							onChange={onLocationChange}
							includeAny
							className="grid gap-3 md:grid-cols-3"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="language">{t("workers.register.languages")}</Label>
						<select
							id="language"
							value={filter.language ?? ""}
							onChange={(e) => set("language", e.target.value || undefined)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							{languages?.map((language) => (
								<option key={language.value} value={language.value}>
									{language.labelEn}
								</option>
							))}
						</select>
					</div>
				</CardContent>
			</Card>

			<p className="text-sm text-muted-foreground">
				{isLoading ? t("common.loading") : t("workers.count", { count: data?.meta.total ?? 0 })}
			</p>

			<div className="grid gap-3 md:grid-cols-2">
				{data?.data.map((worker) => (
					<CustomerWorkerCard key={worker.id} worker={worker} />
				))}
			</div>

			{data && data.data.length === 0 && (
				<Card className="border-dashed">
					<CardContent className="py-12 text-center text-sm text-muted-foreground">
						{t("workers.emptyHeading")}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
