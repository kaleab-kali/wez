import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLookupKind } from "#features/lookups/api/lookup.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { useWorkers, type Worker, type WorkerFilter } from "#features/workers/api/worker.queries";
import { WorkerDirectoryCard } from "#features/workers/components/WorkerDirectoryCard";
import { LocationHierarchySelect, type LocationHierarchySelection } from "#shared/components/LocationHierarchySelect";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/workers/")({
	component: CustomerWorkersPage,
});

const CustomerWorkerCard = React.memo(({ worker }: { readonly worker: Worker }) => {
	return (
		<Link to="/app/workers/$id" params={{ id: worker.id }} className="block group">
			<WorkerDirectoryCard worker={worker} variant="customer" />
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

			<div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))]">
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
