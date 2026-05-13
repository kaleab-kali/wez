import { UserAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLookupKind } from "#features/lookups/api/lookup.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { useWorkers, type Worker, type WorkerFilter } from "#features/workers/api/worker.queries";
import { WorkerProfilePhoto } from "#features/workers/components/WorkerProfilePhoto";
import { LocationHierarchySelect, type LocationHierarchySelection } from "#shared/components/LocationHierarchySelect";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff/workers/")({
	component: WorkerBrowsePage,
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

const FilterPanel = React.memo(
	({ filter, onChange }: { readonly filter: WorkerFilter; readonly onChange: (next: WorkerFilter) => void }) => {
		const { t } = useTranslation();
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
		const set = React.useCallback(
			<K extends keyof WorkerFilter>(k: K, v: WorkerFilter[K]) => onChange({ ...filter, [k]: v, page: 1 }),
			[filter, onChange],
		);
		const onLocationChange = React.useCallback(
			(next: LocationHierarchySelection) => {
				onChange({
					...filter,
					adminAreaId: next.adminAreaId,
					subAreaId: next.subAreaId,
					localityId: next.localityId,
					woreda: undefined,
					page: 1,
				});
			},
			[filter, onChange],
		);
		return (
			<Card className="w-72 shrink-0 sticky top-20">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm">{t("common.filters")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="q">{t("common.search")}</Label>
						<Input
							id="q"
							placeholder={t("workers.filterSearchPlaceholder")}
							value={filter.q ?? ""}
							onChange={(e) => set("q", e.target.value || undefined)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="role">{t("workers.filterRole")}</Label>
						<select
							id="role"
							value={filter.roleId ?? ""}
							onChange={(e) => set("roleId", e.target.value || undefined)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<option value="">{t("common.any")}</option>
							{roles?.map((r) => (
								<option key={r.id} value={r.id}>
									{r.name}
								</option>
							))}
						</select>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="tier">{t("workers.filterMinTier")}</Label>
							<select
								id="tier"
								value={filter.minTier ?? ""}
								onChange={(e) => set("minTier", (e.target.value || undefined) as WorkerFilter["minTier"])}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">{t("common.any")}</option>
								<option value="basic">basic</option>
								<option value="verified">verified</option>
								<option value="trained">trained</option>
								<option value="trusted">trusted</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="gender">{t("workers.filterGender")}</Label>
							<select
								id="gender"
								value={filter.gender ?? ""}
								onChange={(e) => set("gender", (e.target.value || undefined) as WorkerFilter["gender"])}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">{t("common.any")}</option>
								<option value="M">{t("workers.genderM")}</option>
								<option value="F">{t("workers.genderF")}</option>
							</select>
						</div>
					</div>
					<LocationHierarchySelect
						idPrefix="staff-worker-location-filter"
						value={locationValue}
						onChange={onLocationChange}
						includeAny
						className="space-y-3"
					/>
					<div className="space-y-2">
						<Label htmlFor="lang">{t("workers.register.languages")}</Label>
						<select
							id="lang"
							value={filter.language ?? ""}
							onChange={(e) => set("language", e.target.value || undefined)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							{languages?.map((l) => (
								<option key={l.value} value={l.value}>
									{l.labelEn}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="exp">{t("workers.filterMinExperience")}</Label>
						<Input
							id="exp"
							type="number"
							min={0}
							value={filter.minExperience ?? ""}
							onChange={(e) => set("minExperience", e.target.value ? Number(e.target.value) : undefined)}
						/>
					</div>
					<div className="space-y-2 pt-2 border-t">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={!!filter.hasHealthCard}
								onChange={(e) => set("hasHealthCard", e.target.checked || undefined)}
								className="size-4 rounded border-input"
							/>
							{t("workers.filterHasHealth")}
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={!!filter.hasPoliceClearance}
								onChange={(e) => set("hasPoliceClearance", e.target.checked || undefined)}
								className="size-4 rounded border-input"
							/>
							{t("workers.filterHasPolice")}
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={!!filter.hideFlagged}
								onChange={(e) => set("hideFlagged", e.target.checked || undefined)}
								className="size-4 rounded border-input"
							/>
							{t("workers.filterHideFlagged")}
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={!!filter.availableOnly}
								onChange={(e) => set("availableOnly", e.target.checked || undefined)}
								className="size-4 rounded border-input"
							/>
							{t("workers.filterAvailableOnly")}
						</label>
					</div>
					<Button variant="outline" size="sm" className="w-full" onClick={() => onChange({ page: 1, limit: 20 })}>
						{t("common.clearFilters")}
					</Button>
				</CardContent>
			</Card>
		);
	},
);
FilterPanel.displayName = "FilterPanel";

const WorkerCard = React.memo(
	({ w }: { readonly w: Worker }) => {
		const { t } = useTranslation();
		const primaryRole = w.roles[0] ? formatRoleId(w.roles[0]) : t("workers.profile.skillsTitle");
		const canOperate = w.canOperate ?? true;
		const stationLabel = w.registeredAtStationName ?? t("hireRequests.workerStationPending");
		const card = (
			<Card
				className={
					canOperate
						? "h-full overflow-hidden transition-all group-hover:border-primary/40 group-hover:shadow-sm"
						: "h-full overflow-hidden border-dashed bg-muted/20"
				}
			>
				<CardHeader className="p-4">
					<div className="flex min-w-0 items-start gap-4">
						<WorkerProfilePhoto worker={w} className="size-20 shrink-0 text-2xl sm:size-24 sm:text-3xl" />
						<div className="min-w-0 flex-1 space-y-2">
							<div className="min-w-0">
								<CardTitle className="text-lg leading-snug break-words [overflow-wrap:anywhere]">
									{w.fullName}
								</CardTitle>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
									{primaryRole} / {w.gender === "M" ? t("workers.genderM") : t("workers.genderF")} /{" "}
									{t("workers.expYearsShort", { n: w.experienceYears })}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-1.5">
								<Badge variant={TIER_VARIANT[w.tier]} className="capitalize">
									{w.tier}
								</Badge>
								{!w.available && (
									<Badge variant="secondary" className="font-normal">
										{t("workers.busy")}
									</Badge>
								)}
								{!canOperate && (
									<Badge variant="secondary" className="font-normal">
										{t("workers.networkOnly")}
									</Badge>
								)}
								{w.hopFlag !== "none" && (
									<Badge variant="destructive" className="capitalize text-[10px]">
										{w.hopFlag}
									</Badge>
								)}
							</div>
							<p className="text-xs leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
								{t("hireRequests.station")}: {stationLabel}
							</p>
						</div>
					</div>
				</CardHeader>
			</Card>
		);
		if (!canOperate) return <div className="block">{card}</div>;
		return (
			<Link to="/staff/workers/$id" params={{ id: w.id }} className="block group">
				{card}
			</Link>
		);
	},
	(p, n) => p.w.id === n.w.id && p.w.updatedAt === n.w.updatedAt,
);
WorkerCard.displayName = "WorkerCard";

function WorkerBrowsePage() {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<WorkerFilter>({ page: 1, limit: 20 });
	const { data, isLoading } = useWorkers(filter);
	const { data: session } = useAdminSession();
	const user = session?.user as { role?: string; roles?: string[] } | undefined;
	const userRoles = React.useMemo(() => effectiveStaffRoles(user?.role, user?.roles), [user?.role, user?.roles]);
	const canCreateWorker = React.useMemo(
		() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.workerEmployerCreation),
		[userRoles],
	);

	const total = data?.meta.total ?? 0;

	return (
		<div className="space-y-6">
			<header className="flex items-start justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{t("workers.title")}</h1>
					<p className="text-sm text-muted-foreground mt-1">{t("workers.count", { count: total })}</p>
				</div>
				{canCreateWorker && (
					<Link to="/staff/workers/new">
						<Button>
							<HugeiconsIcon icon={UserAdd01Icon} className="size-4 mr-2" />
							{t("workers.registerCta")}
						</Button>
					</Link>
				)}
			</header>
			<div className="flex gap-6 items-start">
				<FilterPanel filter={filter} onChange={setFilter} />
				<div className="flex-1 min-w-0">
					{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
						{data?.data.map((w) => (
							<WorkerCard key={w.id} w={w} />
						))}
					</div>
					{data && data.data.length === 0 && (
						<Card className="border-dashed">
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<p className="text-muted-foreground">{t("workers.emptyHeading")}</p>
								<Button variant="link" onClick={() => setFilter({ page: 1, limit: 20 })}>
									{t("common.clearFilters")}
								</Button>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
