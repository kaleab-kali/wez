import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type HireRequest,
	type HireRequestFilter,
	useHireRequests,
} from "#features/hire-requests/api/hire-request.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/staff/hire-requests/")({
	component: HireRequestsPage,
});

const STATUS_VARIANT: Record<HireRequest["status"], "default" | "secondary" | "outline" | "destructive"> = {
	awaiting_visit: "default",
	completed: "secondary",
	cancelled: "outline",
	expired: "destructive",
};

function HireRequestsPage() {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<HireRequestFilter>({ page: 1, limit: 20 });
	const { data, isLoading } = useHireRequests(filter);

	const statusLabel = (s: HireRequest["status"]) => {
		switch (s) {
			case "awaiting_visit":
				return t("hireRequests.statusAwaiting");
			case "completed":
				return t("hireRequests.statusCompleted");
			case "cancelled":
				return t("hireRequests.statusCancelled");
			case "expired":
				return t("hireRequests.statusExpired");
		}
	};

	return (
		<div className="space-y-4 max-w-5xl">
			<div className="flex items-start justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{t("hireRequests.title")}</h1>
					<p className="text-sm text-muted-foreground mt-1">{data?.meta.total ?? 0}</p>
				</div>
				<select
					value={filter.status ?? ""}
					onChange={(e) => setFilter({ ...filter, status: (e.target.value || undefined) as HireRequest["status"] | undefined, page: 1 })}
					className="rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					<option value="">{t("common.any")}</option>
					<option value="awaiting_visit">{t("hireRequests.statusAwaiting")}</option>
					<option value="completed">{t("hireRequests.statusCompleted")}</option>
					<option value="cancelled">{t("hireRequests.statusCancelled")}</option>
					<option value="expired">{t("hireRequests.statusExpired")}</option>
				</select>
			</div>
			{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
			<div className="space-y-3">
				{data?.data.map((r) => (
					<Card key={r.id}>
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<CardTitle className="text-sm font-mono">{r.id.slice(0, 8)}</CardTitle>
									<p className="text-xs text-muted-foreground mt-1">
										worker {r.workerId.slice(0, 8)} · employer {r.employerId.slice(0, 8)} · {r.roleId}
									</p>
								</div>
								<Badge variant={STATUS_VARIANT[r.status]}>{statusLabel(r.status)}</Badge>
							</div>
						</CardHeader>
						<CardContent className="grid grid-cols-2 md:grid-cols-4 text-sm gap-3 pt-0">
							<div>
								<p className="text-muted-foreground text-xs">{t("hireRequests.proposedSalary")}</p>
								<p className="font-mono">{(Number(r.proposedSalaryCents) / 100).toLocaleString()} ETB</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">{t("hireRequests.channel")}</p>
								<p className="capitalize">{r.channel.replace("_", " ")}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Expires</p>
								<p className="text-xs">{new Date(r.expiresAt).toLocaleString()}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Created</p>
								<p className="text-xs">{new Date(r.createdAt).toLocaleString()}</p>
							</div>
							{r.note && (
								<div className="col-span-full">
									<p className="text-muted-foreground text-xs">{t("hireRequests.note")}</p>
									<p>{r.note}</p>
								</div>
							)}
							{r.cancellationReason && (
								<div className="col-span-full">
									<p className="text-muted-foreground text-xs">{t("hireRequests.cancelReason")}</p>
									<p>{r.cancellationReason}</p>
								</div>
							)}
						</CardContent>
					</Card>
				))}
				{data && data.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<p className="text-muted-foreground">No hire requests yet.</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
