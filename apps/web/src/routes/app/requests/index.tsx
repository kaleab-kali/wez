import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useHireRequests } from "#features/hire-requests/api/hire-request.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/requests/")({
	component: CustomerRequestsPage,
});

function CustomerRequestsPage() {
	const { t } = useTranslation();
	const { data, isLoading } = useHireRequests({ page: 1, limit: 20 });

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{t("hireRequests.title")}</h1>
				<p className="text-sm text-muted-foreground">
					{isLoading ? t("common.loading") : t("hireRequests.count", { count: data?.meta.total ?? 0 })}
				</p>
			</div>
			<div className="grid gap-3">
				{data?.data.map((request) => (
					<Card key={request.id}>
						<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
							<div>
								<CardTitle className="text-base">{request.workerName ?? request.workerId.slice(0, 8)}</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									{request.roleName ?? request.roleId} - {(Number(request.proposedSalaryCents) / 100).toLocaleString()}{" "}
									ETB
								</p>
							</div>
							<Badge variant="outline">{request.status.replace("_", " ")}</Badge>
						</CardHeader>
						{request.note && (
							<CardContent>
								<p className="text-sm text-muted-foreground">{request.note}</p>
							</CardContent>
						)}
					</Card>
				))}
				{data && data.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">
							{t("hireRequests.empty")}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
