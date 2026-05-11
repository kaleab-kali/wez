import { createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type HireRequest,
	useCancelHireRequest,
	useHireRequests,
} from "#features/hire-requests/api/hire-request.queries";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CustomerRequestsPage = memo(() => {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isWorker = role === "worker";
	const { data, isLoading } = useHireRequests({ page: 1, limit: 20 });

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{t("hireRequests.title")}</h1>
				<p className="text-sm text-muted-foreground">
					{isWorker
						? t("hireRequests.workerBody")
						: isLoading
							? t("common.loading")
							: t("hireRequests.count", { count: data?.meta.total ?? 0 })}
				</p>
			</div>
			<div className="grid gap-3">
				{data?.data.map((request) => (
					<RequestCard key={request.id} request={request} isWorker={isWorker} />
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
});
CustomerRequestsPage.displayName = "CustomerRequestsPage";

const RequestCard = memo(({ request, isWorker }: { readonly request: HireRequest; readonly isWorker: boolean }) => {
	const { t } = useTranslation();
	const cancel = useCancelHireRequest(request.id);
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);
	const canCancel = !isWorker && request.status === "awaiting_visit";

	const onReasonChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setReason(event.target.value);
		setError(null);
	}, []);

	const onCancel = useCallback(async () => {
		const trimmed = reason.trim();
		if (trimmed.length < 2) {
			setError(t("hireRequests.cancelReasonRequired"));
			return;
		}
		await cancel.mutateAsync({ reason: trimmed });
		setReason("");
		setError(null);
	}, [cancel, reason, t]);

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
				<div>
					<CardTitle className="text-base">
						{isWorker
							? (request.employerName ?? request.employerId.slice(0, 8))
							: (request.workerName ?? request.workerId.slice(0, 8))}
					</CardTitle>
					<p className="mt-1 text-sm text-muted-foreground">
						{request.roleName ?? request.roleId} - {(Number(request.proposedSalaryCents) / 100).toLocaleString()} ETB
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{t("hireRequests.station")}: {request.stationName ?? request.stationId.slice(0, 8)}
					</p>
				</div>
				<Badge variant="outline">{request.status.replace("_", " ")}</Badge>
			</CardHeader>
			{(request.note || canCancel) && (
				<CardContent className="space-y-3">
					{request.note && <p className="text-sm text-muted-foreground">{request.note}</p>}
					{canCancel && (
						<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
							<Input
								aria-label={t("hireRequests.cancelReason")}
								value={reason}
								onChange={onReasonChange}
								placeholder={t("hireRequests.cancelReason")}
							/>
							<Button type="button" variant="outline" onClick={onCancel} disabled={cancel.isPending}>
								{t("hireRequests.cancel")}
							</Button>
							{error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
});
RequestCard.displayName = "RequestCard";

export const Route = createFileRoute("/app/requests/")({
	component: CustomerRequestsPage,
});
