import React from "react";
import { useTranslation } from "react-i18next";
import { useEmployers } from "#features/employers/api/employer.queries";
import {
	PAYMENT_METHODS,
	type PaymentMethod,
	useFinalizeFreshPlacement,
} from "#features/placements/api/placement.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { usePublicStations } from "#features/stations/api/station.queries";
import { useWorkers } from "#features/workers/api/worker.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CENTS_PER_BIRR = 100;

const formatBirr = (cents: number | string) => `${(Number(cents) / CENTS_PER_BIRR).toLocaleString()} ETB`;

const calculateCommissionCents = (
	role: { commType: "flat" | "percent"; commValue: number } | undefined,
	salaryBirr: number,
) => {
	if (!role) return null;
	const salaryCents = Math.round(salaryBirr * CENTS_PER_BIRR);
	return role.commType === "percent"
		? Math.round((salaryCents * role.commValue) / CENTS_PER_BIRR)
		: role.commValue * CENTS_PER_BIRR;
};

export const FreshPlacementForm = React.memo(() => {
	const { t } = useTranslation();
	const finalize = useFinalizeFreshPlacement();
	const workers = useWorkers({ availableOnly: true, hideFlagged: true, limit: 50, page: 1 });
	const employers = useEmployers({ limit: 50, page: 1 });
	const roles = usePublicRoles();
	const stations = usePublicStations();
	const [open, setOpen] = React.useState(false);
	const [workerId, setWorkerId] = React.useState("");
	const [employerId, setEmployerId] = React.useState("");
	const [roleId, setRoleId] = React.useState("");
	const [stationId, setStationId] = React.useState("");
	const [salary, setSalary] = React.useState(0);
	const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
	const [paymentReference, setPaymentReference] = React.useState("");
	const [startDate, setStartDate] = React.useState(() => new Date().toISOString().slice(0, 10));
	const [paymentReceived, setPaymentReceived] = React.useState(false);
	const [cashDoubleConfirmed, setCashDoubleConfirmed] = React.useState(false);
	const [error, setError] = React.useState("");

	const selectedRole = React.useMemo(() => roles.data?.find((role) => role.id === roleId), [roleId, roles.data]);
	const commissionCents = React.useMemo(() => calculateCommissionCents(selectedRole, salary), [salary, selectedRole]);
	const isCash = paymentMethod === "cash";
	const canSubmit =
		workerId &&
		employerId &&
		roleId &&
		stationId &&
		salary > 0 &&
		paymentReference.trim() &&
		paymentReceived &&
		(!isCash || cashDoubleConfirmed);

	const onToggleOpen = React.useCallback(() => setOpen((current) => !current), []);
	const onWorkerChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setWorkerId(event.target.value);
	}, []);
	const onEmployerChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setEmployerId(event.target.value);
	}, []);
	const onRoleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			const nextRoleId = event.target.value;
			const nextRole = roles.data?.find((role) => role.id === nextRoleId);
			setRoleId(nextRoleId);
			setSalary(nextRole ? Number(nextRole.salaryMinCents) / CENTS_PER_BIRR : 0);
		},
		[roles.data],
	);
	const onStationChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setStationId(event.target.value);
	}, []);
	const onPaymentMethodChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setPaymentMethod(event.target.value as PaymentMethod);
		setCashDoubleConfirmed(false);
	}, []);
	const onReset = React.useCallback(() => {
		setWorkerId("");
		setEmployerId("");
		setRoleId("");
		setStationId("");
		setSalary(0);
		setPaymentMethod("cash");
		setPaymentReference("");
		setStartDate(new Date().toISOString().slice(0, 10));
		setPaymentReceived(false);
		setCashDoubleConfirmed(false);
		setError("");
	}, []);
	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			setError("");
			try {
				await finalize.mutateAsync({
					workerId,
					employerId,
					roleId,
					stationId,
					startDate,
					salaryCents: Math.round(salary * CENTS_PER_BIRR),
					paymentMethod,
					paymentReference,
					paymentReceivedAt: new Date().toISOString(),
					cashDoubleConfirmed: isCash ? cashDoubleConfirmed : undefined,
				});
				onReset();
				setOpen(false);
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[
			cashDoubleConfirmed,
			employerId,
			finalize,
			isCash,
			onReset,
			paymentMethod,
			paymentReference,
			roleId,
			salary,
			startDate,
			stationId,
			t,
			workerId,
		],
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle className="text-base">
					{t("placements.freshTitle", { defaultValue: "Fresh desk placement" })}
				</CardTitle>
				<Button type="button" variant={open ? "outline" : "default"} onClick={onToggleOpen}>
					{open ? t("common.cancel") : t("placements.startFresh", { defaultValue: "Start fresh placement" })}
				</Button>
			</CardHeader>
			{open && (
				<CardContent>
					<form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
						{error && (
							<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive md:col-span-4">{error}</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="fresh-worker">{t("workers.title")}</Label>
							<select
								id="fresh-worker"
								value={workerId}
								onChange={onWorkerChange}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								required
							>
								<option value="">{t("common.any")}</option>
								{workers.data?.data.map((worker) => (
									<option key={worker.id} value={worker.id}>
										{worker.fullName} - {worker.phone}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fresh-employer">{t("employers.title")}</Label>
							<select
								id="fresh-employer"
								value={employerId}
								onChange={onEmployerChange}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								required
							>
								<option value="">{t("common.any")}</option>
								{employers.data?.data.map((employer) => (
									<option key={employer.id} value={employer.id}>
										{employer.name} - {employer.phone}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fresh-role">{t("roleCatalog.title")}</Label>
							<select
								id="fresh-role"
								value={roleId}
								onChange={onRoleChange}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								required
							>
								<option value="">{t("common.any")}</option>
								{roles.data?.map((role) => (
									<option key={role.id} value={role.id}>
										{role.name} - {formatBirr(role.salaryMinCents)} to {formatBirr(role.salaryMaxCents)}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fresh-station">{t("stations.title")}</Label>
							<select
								id="fresh-station"
								value={stationId}
								onChange={onStationChange}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
								required
							>
								<option value="">{t("common.any")}</option>
								{stations.data?.map((station) => (
									<option key={station.id} value={station.id}>
										{station.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fresh-start">{t("placements.startDate")}</Label>
							<Input
								id="fresh-start"
								type="date"
								value={startDate}
								onChange={(event) => setStartDate(event.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fresh-salary">{t("placements.salary")}</Label>
							<Input
								id="fresh-salary"
								type="number"
								min={0}
								value={salary}
								onChange={(event) => setSalary(Number(event.target.value))}
								required
							/>
						</div>
						<div className="rounded-md border bg-muted/30 p-3 md:col-span-2">
							<p className="text-xs text-muted-foreground">{t("placements.amountToCollect")}</p>
							<p className="mt-1 font-mono text-lg font-semibold">
								{commissionCents === null ? "-" : formatBirr(commissionCents)}
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fresh-payment-method">{t("placements.paymentMethod")}</Label>
							<select
								id="fresh-payment-method"
								value={paymentMethod}
								onChange={onPaymentMethodChange}
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
						<div className="space-y-2 md:col-span-3">
							<Label htmlFor="fresh-payment-reference">{t("placements.paymentReference")}</Label>
							<Input
								id="fresh-payment-reference"
								value={paymentReference}
								onChange={(event) => setPaymentReference(event.target.value)}
								required
							/>
						</div>
						<label htmlFor="fresh-paid" className="flex items-start gap-2 rounded-md border p-3 md:col-span-4">
							<input
								id="fresh-paid"
								type="checkbox"
								checked={paymentReceived}
								onChange={(event) => setPaymentReceived(event.target.checked)}
								className="mt-1"
								required
							/>
							<span>
								<span className="block text-sm font-medium">{t("placements.paymentReceivedConfirm")}</span>
								<span className="block text-xs text-muted-foreground">
									{t("placements.printAgreementAfterFinalize")}
								</span>
							</span>
						</label>
						{isCash && (
							<label
								htmlFor="fresh-cash-confirmed"
								className="flex items-start gap-2 rounded-md border p-3 md:col-span-4"
							>
								<input
									id="fresh-cash-confirmed"
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
						<div className="flex justify-end md:col-span-4">
							<Button type="submit" disabled={!canSubmit || finalize.isPending}>
								{finalize.isPending ? t("common.saving") : t("placements.confirmFinalize")}
							</Button>
						</div>
					</form>
				</CardContent>
			)}
		</Card>
	);
});
FreshPlacementForm.displayName = "FreshPlacementForm";
