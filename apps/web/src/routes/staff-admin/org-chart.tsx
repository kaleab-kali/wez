import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type StaffOrgChartStation,
	type StaffOrgChartUser,
	useStaffOrgChart,
} from "#features/staff-users/api/staff-user.queries";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const roleLabel = (value: string) => value.replaceAll("_", " ");

const StaffPerson = React.memo(({ user }: { readonly user: StaffOrgChartUser }) => (
	<div className="rounded-md border bg-background p-3">
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<p className="truncate text-sm font-medium">{user.name}</p>
				<p className="truncate text-xs text-muted-foreground">{user.email}</p>
			</div>
			<Badge variant="outline" className="shrink-0 capitalize">
				{roleLabel(user.role)}
			</Badge>
		</div>
	</div>
));
StaffPerson.displayName = "StaffPerson";

const PeopleList = React.memo(
	({ users, emptyLabel }: { readonly users: readonly StaffOrgChartUser[]; readonly emptyLabel: string }) => {
		if (users.length === 0) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
		return (
			<div className="grid gap-2">
				{users.map((user) => (
					<StaffPerson key={user.id} user={user} />
				))}
			</div>
		);
	},
);
PeopleList.displayName = "PeopleList";

const OrgChartPage = React.memo(() => {
	const { t } = useTranslation();
	const { data, isLoading, error } = useStaffOrgChart();

	const stationColumns = React.useMemo<ColumnDef<StaffOrgChartStation>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("stations.title"),
				cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
			},
			{
				id: "supervisor",
				header: t("orgChart.supervisor"),
				cell: ({ row }) => row.original.supervisor?.name ?? t("orgChart.noSupervisor"),
			},
			{
				id: "agents",
				header: t("orgChart.agents"),
				cell: ({ row }) =>
					row.original.agents.length > 0
						? row.original.agents.map((agent) => agent.name).join(", ")
						: t("orgChart.noAgents"),
			},
		],
		[t],
	);

	return (
		<div className="max-w-6xl space-y-5">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground transition hover:text-foreground">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="mt-2 text-2xl font-bold tracking-tight">{t("orgChart.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("orgChart.subtitle")}</p>
			</div>

			{error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{t("common.error")}</p>}

			<div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<Card>
					<CardHeader>
						<CardTitle>{t("orgChart.executiveOffice")}</CardTitle>
					</CardHeader>
					<CardContent>
						<PeopleList
							users={data?.executives ?? []}
							emptyLabel={isLoading ? t("common.loading") : t("orgChart.noExecutives")}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("orgChart.functionalManagers")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 md:grid-cols-2">
							{(data?.functionalManagers ?? []).map((group) => (
								<div key={group.role} className="rounded-md border bg-muted/20 p-3">
									<p className="mb-2 text-sm font-semibold capitalize">{roleLabel(group.role)}</p>
									<PeopleList
										users={group.users}
										emptyLabel={isLoading ? t("common.loading") : t("orgChart.noManagerAssigned")}
									/>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("orgChart.stationStructure")}</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={stationColumns}
						data={data?.stations ?? []}
						isLoading={isLoading}
						searchKey="name"
						searchPlaceholder={t("orgChart.searchStations")}
						emptyMessage={t("orgChart.noStations")}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("orgChart.unassignedAgents")}</CardTitle>
				</CardHeader>
				<CardContent>
					<PeopleList
						users={data?.unassignedAgents ?? []}
						emptyLabel={isLoading ? t("common.loading") : t("orgChart.noUnassignedAgents")}
					/>
				</CardContent>
			</Card>
		</div>
	);
});
OrgChartPage.displayName = "OrgChartPage";

export const Route = createFileRoute("/staff-admin/org-chart")({
	component: OrgChartPage,
});
