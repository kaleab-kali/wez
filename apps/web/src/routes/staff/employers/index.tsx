import { createFileRoute, Link } from "@tanstack/react-router";
import { UserAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { type Employer, type EmployerFilter, useEmployers } from "#features/employers/api/employer.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff/employers/")({
	component: EmployersBrowsePage,
});

const RATING_VARIANT: Record<Employer["rating"], "default" | "secondary" | "outline" | "destructive"> = {
	green: "default",
	yellow: "secondary",
	orange: "outline",
	red: "destructive",
};

const EmployerCard = React.memo(
	({ e }: { readonly e: Employer }) => {
		const { t } = useTranslation();
		return (
			<Link to="/staff/employers/$id" params={{ id: e.id }} className="block group">
				<Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<CardTitle className="text-base truncate">{e.name}</CardTitle>
								<CardDescription className="text-xs">
									{e.type === "business" ? t("landing.business") : t("landing.household")} · {e.area}
								</CardDescription>
							</div>
							<Badge variant={RATING_VARIANT[e.rating]} className="capitalize">
								{e.rating}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						{e.contactName && <p className="text-muted-foreground">{e.contactName}</p>}
						<p className="font-mono text-xs text-muted-foreground">{e.phone}</p>
						<div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-2.5">
							<span>{e.placementsCount} placements</span>
							{e.complaintsCount > 0 && (
								<>
									<span aria-hidden>·</span>
									<span className="text-amber-600">{e.complaintsCount} complaints</span>
								</>
							)}
						</div>
					</CardContent>
				</Card>
			</Link>
		);
	},
	(p, n) => p.e.id === n.e.id && p.e.updatedAt === n.e.updatedAt,
);
EmployerCard.displayName = "EmployerCard";

function EmployersBrowsePage() {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<EmployerFilter>({ page: 1, limit: 20 });
	const { data, isLoading } = useEmployers(filter);

	return (
		<div className="space-y-6">
			<header className="flex items-start justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{t("employers.title")}</h1>
					<p className="text-sm text-muted-foreground mt-1">{data?.meta.total ?? 0}</p>
				</div>
				<Link to="/staff/employers/new">
					<Button>
						<HugeiconsIcon icon={UserAdd01Icon} className="size-4 mr-2" />
						{t("employers.register")}
					</Button>
				</Link>
			</header>
			<div className="flex gap-6 items-start">
				<Card className="w-72 shrink-0">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm">{t("common.filters")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="q">{t("common.search")}</Label>
							<Input
								id="q"
								placeholder="Name, contact, phone"
								value={filter.q ?? ""}
								onChange={(e) => setFilter({ ...filter, q: e.target.value || undefined, page: 1 })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="type">{t("landing.employerType")}</Label>
							<select
								id="type"
								value={filter.type ?? ""}
								onChange={(e) => setFilter({ ...filter, type: (e.target.value || undefined) as EmployerFilter["type"], page: 1 })}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">{t("common.any")}</option>
								<option value="business">{t("landing.business")}</option>
								<option value="household">{t("landing.household")}</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="rating">Rating</Label>
							<select
								id="rating"
								value={filter.rating ?? ""}
								onChange={(e) => setFilter({ ...filter, rating: (e.target.value || undefined) as EmployerFilter["rating"], page: 1 })}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">{t("common.any")}</option>
								<option value="green">green</option>
								<option value="yellow">yellow</option>
								<option value="orange">orange</option>
								<option value="red">red</option>
							</select>
						</div>
					</CardContent>
				</Card>
				<div className="flex-1 min-w-0">
					{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
						{data?.data.map((e) => (
							<EmployerCard key={e.id} e={e} />
						))}
					</div>
					{data && data.data.length === 0 && (
						<Card className="border-dashed">
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<p className="text-muted-foreground">No employers yet.</p>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
