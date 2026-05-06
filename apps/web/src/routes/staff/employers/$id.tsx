import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useEmployer } from "#features/employers/api/employer.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RATING_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
	green: "default",
	yellow: "secondary",
	orange: "outline",
	red: "destructive",
};

const EmployerDetailPage = React.memo(() => {
	const { t } = useTranslation();
	const { id } = Route.useParams();
	const { data: e, isLoading } = useEmployer(id);

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!e) return <p className="text-sm text-muted-foreground">Not found.</p>;

	return (
		<div className="max-w-3xl space-y-4">
			<div>
				<Link to="/staff/employers" className="text-sm text-muted-foreground hover:text-foreground">
					&larr; {t("employers.title")}
				</Link>
				<div className="mt-3 flex items-start justify-between flex-wrap gap-3">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{e.name}</h1>
						<p className="text-sm text-muted-foreground mt-1">
							{e.type === "business" ? t("landing.business") : t("landing.household")} · {e.area}
						</p>
					</div>
					<Badge variant={RATING_VARIANT[e.rating]} className="capitalize">
						{e.rating}
					</Badge>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Contact</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 text-sm gap-3">
					{e.contactName && (
						<div>
							<p className="text-muted-foreground text-xs">{t("landing.contactName")}</p>
							<p>{e.contactName}</p>
						</div>
					)}
					<div>
						<p className="text-muted-foreground text-xs">{t("workers.register.phone")}</p>
						<p className="font-mono">{e.phone}</p>
					</div>
					{e.email && (
						<div>
							<p className="text-muted-foreground text-xs">{t("auth.email")}</p>
							<p className="font-mono">{e.email}</p>
						</div>
					)}
				</CardContent>
			</Card>

			{e.type === "business" && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Business</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-2 text-sm gap-3">
						{e.tin && (
							<div>
								<p className="text-muted-foreground text-xs">TIN</p>
								<p className="font-mono">{e.tin}</p>
							</div>
						)}
						{e.businessLicense && (
							<div>
								<p className="text-muted-foreground text-xs">{t("landing.businessLicense")}</p>
								<p className="font-mono">{e.businessLicense}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Stats</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<p className="text-muted-foreground text-xs">Placements</p>
						<p className="font-mono text-lg">{e.placementsCount}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Complaints</p>
						<p className="font-mono text-lg">{e.complaintsCount}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
});
EmployerDetailPage.displayName = "EmployerDetailPage";

export const Route = createFileRoute("/staff/employers/$id")({
	component: EmployerDetailPage,
});
