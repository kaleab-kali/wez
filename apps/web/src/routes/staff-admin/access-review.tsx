import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocations } from "#features/locations/api/location.queries";
import { useStaffUsers } from "#features/staff-users/api/staff-user.queries";
import { useStations } from "#features/stations/api/station.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formatOption = (value: string) => value.replace(/_/g, " ");
type AccessReviewRow = {
	readonly id: string;
	readonly name: string;
	readonly email: string;
	readonly role: string;
	readonly scopeType: string;
	readonly scopeId: string | null;
	readonly active: boolean;
};

type ScopeLookup = {
	readonly locationById: ReadonlyMap<string, string>;
	readonly stationById: ReadonlyMap<string, string>;
};

const scopeLabel = (row: AccessReviewRow, lookup: ScopeLookup, globalLabel: string, missingScopeLabel: string) => {
	if (row.scopeType === "global") return globalLabel;
	if (!row.scopeId) return missingScopeLabel;
	if (row.scopeType === "station") return lookup.stationById.get(row.scopeId) ?? row.scopeId;
	return lookup.locationById.get(row.scopeId) ?? row.scopeId;
};

const AccessRow = React.memo(
	({
		name,
		email,
		row,
		lookup,
		activeLabel,
		inactiveLabel,
		globalLabel,
		missingScopeLabel,
	}: {
		readonly name: string;
		readonly email: string;
		readonly row: AccessReviewRow;
		readonly lookup: ScopeLookup;
		readonly activeLabel: string;
		readonly inactiveLabel: string;
		readonly globalLabel: string;
		readonly missingScopeLabel: string;
	}) => (
		<tr className="border-t">
			<td className="py-2.5">
				<div className="font-medium">{name}</div>
				<div className="text-xs text-muted-foreground">{email}</div>
			</td>
			<td className="capitalize">{formatOption(row.role)}</td>
			<td className="capitalize">{formatOption(row.scopeType)}</td>
			<td>{scopeLabel(row, lookup, globalLabel, missingScopeLabel)}</td>
			<td>
				<Badge variant={row.active ? "default" : "secondary"} className="text-[10px]">
					{row.active ? activeLabel : inactiveLabel}
				</Badge>
			</td>
		</tr>
	),
);
AccessRow.displayName = "AccessRow";

const AccessReviewPage = React.memo(() => {
	const { t } = useTranslation();
	const { data: users, isLoading } = useStaffUsers();
	const { data: stations } = useStations(true);
	const { data: locations } = useLocations({ includeInactive: true });
	const lookup = React.useMemo<ScopeLookup>(
		() => ({
			stationById: new Map((stations ?? []).map((station) => [station.id, station.name])),
			locationById: new Map((locations ?? []).map((location) => [location.id, location.nameEn])),
		}),
		[locations, stations],
	);
	const rows = React.useMemo(
		() =>
			(users ?? []).flatMap((user): AccessReviewRow[] => {
				const roleRows = user.roleAssignments.map((assignment) => ({
					id: assignment.id,
					name: user.name,
					email: user.email,
					role: assignment.role,
					scopeType: assignment.scopeType,
					scopeId: assignment.scopeId,
					active: assignment.active,
				}));
				const stationRows = user.agentAssignments.map((assignment) => ({
					id: assignment.id,
					name: user.name,
					email: user.email,
					role: "agent",
					scopeType: "station",
					scopeId: assignment.stationId,
					active: user.active,
				}));
				const supervisedStationRows = (stations ?? [])
					.filter((station) => station.supervisorUserId === user.id)
					.map((station) => ({
						id: `${user.id}:${station.id}:supervisor`,
						name: user.name,
						email: user.email,
						role: "station_supervisor",
						scopeType: "station",
						scopeId: station.id,
						active: user.active && station.active,
					}));
				const fallbackRows =
					roleRows.length === 0 && stationRows.length === 0 && supervisedStationRows.length === 0
						? [
								{
									id: `${user.id}:primary`,
									name: user.name,
									email: user.email,
									role: user.role,
									scopeType: "global",
									scopeId: null,
									active: user.active,
								},
							]
						: [];
				return Array.from(
					new Map(
						[...roleRows, ...stationRows, ...supervisedStationRows, ...fallbackRows].map((row) => [
							`${row.email}:${row.role}:${row.scopeType}:${row.scopeId ?? "global"}`,
							row,
						]),
					).values(),
				);
			}),
		[stations, users],
	);

	return (
		<div className="max-w-5xl space-y-4">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground transition hover:text-foreground">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="mt-2 text-2xl font-bold tracking-tight">{t("accessReview.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("accessReview.subtitle")}</p>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>{t("accessReview.currentAccess")}</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className="text-sm text-muted-foreground">{t("common.loading")}</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="border-b text-left text-xs uppercase text-muted-foreground">
									<tr>
										<th className="py-2 font-medium">{t("staffUsers.name")}</th>
										<th className="font-medium">{t("accessReview.role")}</th>
										<th className="font-medium">{t("accessReview.scopeType")}</th>
										<th className="font-medium">{t("accessReview.scope")}</th>
										<th className="font-medium">{t("stations.active")}</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row) => (
										<AccessRow
											key={row.id}
											name={row.name}
											email={row.email}
											row={row}
											lookup={lookup}
											activeLabel={t("common.yes")}
											inactiveLabel={t("common.no")}
											globalLabel={t("accessReview.global")}
											missingScopeLabel={t("accessReview.missingScope")}
										/>
									))}
								</tbody>
							</table>
						</div>
					)}
					{!isLoading && rows.length === 0 && (
						<p className="py-6 text-center text-sm text-muted-foreground">{t("accessReview.empty")}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
});
AccessReviewPage.displayName = "AccessReviewPage";

export const Route = createFileRoute("/staff-admin/access-review")({
	component: AccessReviewPage,
});
