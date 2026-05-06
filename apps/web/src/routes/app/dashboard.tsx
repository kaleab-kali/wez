import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import {
	Book02Icon,
	ContactBookIcon,
	NoteEditIcon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_TILES = [
	{ icon: UserMultipleIcon, titleKey: "app.profile", bodyKey: "app.profileBody" },
	{ icon: ContactBookIcon, titleKey: "app.jobs", bodyKey: "app.jobsBody" },
	{ icon: NoteEditIcon, titleKey: "app.requests", bodyKey: "app.requestsBody" },
	{ icon: Book02Icon, titleKey: "app.training", bodyKey: "app.trainingBody" },
] as const;

const CustomerDashboard = React.memo(() => {
	const { t } = useTranslation();

	return (
		<div className="space-y-8">
			<section className="grid gap-3">
				<p className="text-sm font-medium text-primary">{t("app.shell")}</p>
				<h1 className="max-w-2xl text-3xl font-semibold tracking-tight">{t("app.dashboardTitle")}</h1>
				<p className="max-w-2xl text-muted-foreground">{t("app.dashboardBody")}</p>
			</section>

			<section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{DASHBOARD_TILES.map((tile) => (
					<CustomerTile
						key={tile.titleKey}
						icon={tile.icon}
						title={t(tile.titleKey)}
						body={t(tile.bodyKey)}
					/>
				))}
			</section>

			<Link to="/" className="inline-flex text-sm text-muted-foreground hover:text-foreground">
				{t("common.back")}
			</Link>
		</div>
	);
});
CustomerDashboard.displayName = "CustomerDashboard";

const CustomerTile = React.memo(
	({
		icon: Icon,
		title,
		body,
	}: {
		readonly icon: typeof UserMultipleIcon;
		readonly title: string;
		readonly body: string;
	}) => (
		<Card className="h-full">
			<CardHeader className="space-y-3">
				<div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
					<HugeiconsIcon icon={Icon} className="size-5" />
				</div>
				<CardTitle className="text-base">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription>{body}</CardDescription>
			</CardContent>
		</Card>
	),
);
CustomerTile.displayName = "CustomerTile";

export const Route = createFileRoute("/app/dashboard")({
	component: CustomerDashboard,
});
