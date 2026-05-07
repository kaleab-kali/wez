import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type HireRequest,
	type HireRequestFilter,
	useHireRequests,
} from "#features/hire-requests/api/hire-request.queries";
import { PAYMENT_METHODS, type PaymentMethod, useFinalizePlacement } from "#features/placements/api/placement.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff/hire-requests/")({
	component: HireRequestsPage,
});

const STATUS_VARIANT: Record<HireRequest["status"], "default" | "secondary" | "outline" | "destructive"> = {
	awaiting_visit: "default",
	completed: "secondary",
	cancelled: "outline",
	expired: "destructive",
};

const formatBirr = (cents: string | number) => `${(Number(cents) / 100).toLocaleString()} ETB`;

const calculateCommissionCents = (request: HireRequest, salaryBirr: number) => {
	const salaryCents = Math.round(salaryBirr * 100);
	if (request.roleCommType === "percent" && request.roleCommValue !== undefined) {
		return Math.round((salaryCents * request.roleCommValue) / 100);
	}
	if (request.roleCommType === "flat" && request.roleCommValue !== undefined) {
		return request.roleCommValue * 100;
	}
	return null;
};

const commissionRule = (request: HireRequest) => {
	if (request.roleCommType === "percent" && request.roleCommValue !== undefined) {
		return `${request.roleCommValue}% of final salary`;
	}
	if (request.roleCommType === "flat" && request.roleCommValue !== undefined) {
		return `${request.roleCommValue.toLocaleString()} ETB flat`;
	}
	return "Role commission rule unavailable";
};

function HireRequestsPage() {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<HireRequestFilter>({ page: 1, limit: 20 });
	const [activeFinalizeId, setActiveFinalizeId] = React.useState<string | null>(null);
	const { data, isLoading } = useHireRequests(filter);

	const requestTitle = React.useCallback((request: HireRequest) => {
		const workerName = request.workerName ?? `Worker ${request.workerId.slice(0, 8)}`;
		const employerName = request.employerName ?? `Employer ${request.employerId.slice(0, 8)}`;
		return `${workerName} -> ${employerName}`;
	}, []);

	const statusLabel = React.useCallback(
		(s: HireRequest["status"]) => {
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
		},
		[t],
	);

	return (
		<div className="space-y-4 max-w-5xl">
			<div className="flex items-start justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{t("hireRequests.title")}</h1>
					<p className="text-sm text-muted-foreground mt-1">{data?.meta.total ?? 0}</p>
				</div>
				<select
					value={filter.status ?? ""}
					onChange={(e) =>
						setFilter({
							...filter,
							status: (e.target.value || undefined) as HireRequest["status"] | undefined,
							page: 1,
						})
					}
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
									<CardTitle className="text-sm">{requestTitle(r)}</CardTitle>
									<p className="text-xs text-muted-foreground mt-1">
										{r.roleName ?? r.roleId} - {r.stationName ?? r.stationId.slice(0, 8)} - request {r.id.slice(0, 8)}
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
							{r.status === "awaiting_visit" && (
								<div className="col-span-full border-t pt-3">
									<FinalizePlacementForm
										request={r}
										open={activeFinalizeId === r.id}
										onOpen={() => setActiveFinalizeId(r.id)}
										onClose={() => setActiveFinalizeId(null)}
									/>
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

const FinalizePlacementForm = React.memo(
	({
		request,
		open,
		onOpen,
		onClose,
	}: {
		readonly request: HireRequest;
		readonly open: boolean;
		readonly onOpen: () => void;
		readonly onClose: () => void;
	}) => {
		const { t } = useTranslation();
		const finalize = useFinalizePlacement(request.id);
		const [salary, setSalary] = React.useState(Number(request.proposedSalaryCents) / 100);
		const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
		const [paymentReference, setPaymentReference] = React.useState("");
		const [startDate, setStartDate] = React.useState(() => new Date().toISOString().slice(0, 10));
		const [paymentReceived, setPaymentReceived] = React.useState(false);
		const [cashDoubleConfirmed, setCashDoubleConfirmed] = React.useState(false);
		const [error, setError] = React.useState("");
		const isCash = paymentMethod === "cash";
		const commissionCents = React.useMemo(() => calculateCommissionCents(request, salary), [request, salary]);
		const roleRange = React.useMemo(() => {
			if (!request.roleSalaryMinCents || !request.roleSalaryMaxCents) return "-";
			return `${formatBirr(request.roleSalaryMinCents)} - ${formatBirr(request.roleSalaryMaxCents)}`;
		}, [request.roleSalaryMaxCents, request.roleSalaryMinCents]);

		const onSubmit = React.useCallback(
			async (event: React.FormEvent) => {
				event.preventDefault();
				setError("");
				try {
					await finalize.mutateAsync({
						startDate,
						salaryCents: Math.round(salary * 100),
						paymentMethod,
						paymentReference,
						paymentReceivedAt: new Date().toISOString(),
						cashDoubleConfirmed: isCash ? cashDoubleConfirmed : undefined,
					});
					onClose();
				} catch (err) {
					setError(err instanceof Error ? err.message : t("common.error"));
				}
			},
			[cashDoubleConfirmed, finalize, isCash, onClose, paymentMethod, paymentReference, salary, startDate, t],
		);

		if (!open) {
			return (
				<Button type="button" onClick={onOpen}>
					{t("placements.finalize")}
				</Button>
			);
		}

		return (
			<form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
				{error && (
					<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive md:col-span-4">{error}</div>
				)}
				<div className="grid gap-3 rounded-md border bg-muted/40 p-3 md:col-span-4 md:grid-cols-3">
					<div className="md:col-span-3">
						<p className="font-medium">{t("placements.paymentGateTitle")}</p>
						<p className="mt-1 text-sm text-muted-foreground">{t("placements.paymentGateBody")}</p>
					</div>
					<div className="rounded-md bg-background p-3">
						<p className="text-xs text-muted-foreground">{t("placements.roleRange")}</p>
						<p className="mt-1 font-mono text-sm">{roleRange}</p>
					</div>
					<div className="rounded-md bg-background p-3">
						<p className="text-xs text-muted-foreground">{t("placements.commissionRule")}</p>
						<p className="mt-1 text-sm font-medium">{commissionRule(request)}</p>
					</div>
					<div className="rounded-md bg-background p-3">
						<p className="text-xs text-muted-foreground">{t("placements.amountToCollect")}</p>
						<p className="mt-1 font-mono text-lg font-semibold">
							{commissionCents === null ? "-" : formatBirr(commissionCents)}
						</p>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`start-${request.id}`}>{t("placements.startDate")}</Label>
					<Input
						id={`start-${request.id}`}
						type="date"
						value={startDate}
						onChange={(event) => setStartDate(event.target.value)}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`salary-${request.id}`}>{t("placements.salary")}</Label>
					<Input
						id={`salary-${request.id}`}
						type="number"
						min={0}
						value={salary}
						onChange={(event) => setSalary(Number(event.target.value))}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`method-${request.id}`}>{t("placements.paymentMethod")}</Label>
					<select
						id={`method-${request.id}`}
						value={paymentMethod}
						onChange={(event) => {
							setPaymentMethod(event.target.value as PaymentMethod);
							setCashDoubleConfirmed(false);
						}}
						className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						required
					>
						{PAYMENT_METHODS.map((method) => (
							<option key={method} value={method}>
								{t(`placements.paymentMethods.${method}`)}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`reference-${request.id}`}>{t("placements.paymentReference")}</Label>
					<Input
						id={`reference-${request.id}`}
						value={paymentReference}
						onChange={(event) => setPaymentReference(event.target.value)}
						required
					/>
				</div>
				<label htmlFor={`paid-${request.id}`} className="flex items-start gap-2 rounded-md border p-3 md:col-span-4">
					<input
						id={`paid-${request.id}`}
						type="checkbox"
						checked={paymentReceived}
						onChange={(event) => setPaymentReceived(event.target.checked)}
						className="mt-1"
						required
					/>
					<span>
						<span className="block text-sm font-medium">{t("placements.paymentReceivedConfirm")}</span>
						<span className="block text-xs text-muted-foreground">{t("placements.paymentReceivedConfirmBody")}</span>
					</span>
				</label>
				{isCash && (
					<label
						htmlFor={`cash-confirmed-${request.id}`}
						className="flex items-start gap-2 rounded-md border p-3 md:col-span-4"
					>
						<input
							id={`cash-confirmed-${request.id}`}
							type="checkbox"
							checked={cashDoubleConfirmed}
							onChange={(event) => setCashDoubleConfirmed(event.target.checked)}
							className="mt-1"
							required
						/>
						<span>
							<span className="block text-sm font-medium">{t("placements.cashDoubleConfirm")}</span>
							<span className="block text-xs text-muted-foreground">{t("placements.cashDoubleConfirmBody")}</span>
						</span>
					</label>
				)}
				<div className="flex gap-2 md:col-span-4">
					<Button type="button" variant="outline" onClick={onClose}>
						{t("common.cancel")}
					</Button>
					<Button type="submit" disabled={finalize.isPending || !paymentReceived || (isCash && !cashDoubleConfirmed)}>
						{finalize.isPending ? t("common.saving") : t("placements.confirmFinalize")}
					</Button>
				</div>
			</form>
		);
	},
);
FinalizePlacementForm.displayName = "FinalizePlacementForm";
