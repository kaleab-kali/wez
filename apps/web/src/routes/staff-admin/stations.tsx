import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocations } from "#features/locations/api/location.queries";
import { useStaffUsers } from "#features/staff-users/api/staff-user.queries";
import {
	type Station,
	useAssignStationAgent,
	useCreateStation,
	useRemoveStationAssignment,
	useStationAssignments,
	useStations,
	useUpdateStation,
} from "#features/stations/api/station.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;

const StationCreateForm = React.memo(() => {
	const { t } = useTranslation();
	const create = useCreateStation();
	const [adminAreaId, setAdminAreaId] = React.useState("");
	const [subAreaId, setSubAreaId] = React.useState("");
	const [localityId, setLocalityId] = React.useState("");
	const [phone, setPhone] = React.useState("");
	const [custom, setCustom] = React.useState(false);
	const [customName, setCustomName] = React.useState("");
	const [customWoreda, setCustomWoreda] = React.useState("");
	const [customAddress, setCustomAddress] = React.useState("");
	const [customReason, setCustomReason] = React.useState("");
	const [error, setError] = React.useState("");
	const { data: adminAreas } = useLocations({ kind: "admin_area" });
	const { data: subAreas } = useLocations({ kind: "sub_area", parentId: adminAreaId || undefined });
	const { data: localities } = useLocations({ kind: "locality", parentId: subAreaId || undefined });
	const availableSubAreas = React.useMemo(
		() => (subAreas ?? []).filter((area) => area.parentId === adminAreaId),
		[adminAreaId, subAreas],
	);
	const availableLocalities = React.useMemo(
		() => (localities ?? []).filter((locality) => locality.parentId === subAreaId),
		[localities, subAreaId],
	);

	const onAdminAreaChange = React.useCallback((value: string) => {
		setAdminAreaId(value);
		setSubAreaId("");
		setLocalityId("");
	}, []);

	const onSubAreaChange = React.useCallback((value: string) => {
		setSubAreaId(value);
		setLocalityId("");
	}, []);

	React.useEffect(() => {
		if (!subAreaId || availableSubAreas.some((area) => area.id === subAreaId)) return;
		setSubAreaId("");
		setLocalityId("");
	}, [availableSubAreas, subAreaId]);

	React.useEffect(() => {
		if (!localityId || availableLocalities.some((locality) => locality.id === localityId)) return;
		setLocalityId("");
	}, [availableLocalities, localityId]);

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			if (phone && !ETHIOPIAN_PHONE.test(phone)) {
				setError(t("workers.register.invalidPhone"));
				return;
			}
			try {
				await create.mutateAsync({
					localityId: custom ? undefined : localityId,
					custom,
					name: custom ? customName : undefined,
					woreda: custom ? customWoreda : undefined,
					address: custom ? customAddress : undefined,
					customReason: custom ? customReason : undefined,
					phone: phone || undefined,
				});
				setLocalityId("");
				setPhone("");
				setCustomName("");
				setCustomWoreda("");
				setCustomAddress("");
				setCustomReason("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[create, custom, customAddress, customName, customReason, customWoreda, localityId, phone, t],
	);

	const canSubmit = custom
		? customName && customWoreda && customAddress && customReason.length >= 10
		: adminAreaId && subAreaId && localityId;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("stations.create")}</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{error && (
						<div className="rounded bg-destructive/10 p-2.5 text-sm text-destructive md:col-span-2">{error}</div>
					)}
					<label className="flex items-center gap-2 text-sm md:col-span-2">
						<input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
						{t("stations.customStation")}
					</label>
					{custom ? (
						<>
							<div className="space-y-2">
								<Label htmlFor="station-name">{t("stations.name")}</Label>
								<Input id="station-name" value={customName} onChange={(e) => setCustomName(e.target.value)} required />
							</div>
							<div className="space-y-2">
								<Label htmlFor="station-woreda">{t("stations.woreda")}</Label>
								<Input
									id="station-woreda"
									value={customWoreda}
									onChange={(e) => setCustomWoreda(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="station-address">{t("stations.address")}</Label>
								<Input
									id="station-address"
									value={customAddress}
									onChange={(e) => setCustomAddress(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="station-reason">{t("stations.customReason")}</Label>
								<Input
									id="station-reason"
									value={customReason}
									onChange={(e) => setCustomReason(e.target.value)}
									required
								/>
							</div>
						</>
					) : (
						<>
							<div className="space-y-2">
								<Label htmlFor="admin-area">{t("locations.adminArea")}</Label>
								<select
									id="admin-area"
									value={adminAreaId}
									onChange={(e) => onAdminAreaChange(e.target.value)}
									className="h-10 w-full rounded-md border bg-background px-3 text-sm"
									required
								>
									<option value="">{t("common.select")}</option>
									{adminAreas?.map((area) => (
										<option key={area.id} value={area.id}>
											{area.nameEn}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="sub-area">{t("locations.subArea")}</Label>
								<select
									id="sub-area"
									value={subAreaId}
									onChange={(e) => onSubAreaChange(e.target.value)}
									className="h-10 w-full rounded-md border bg-background px-3 text-sm"
									disabled={!adminAreaId}
									required
								>
									<option value="">{t("common.select")}</option>
									{availableSubAreas.map((area) => (
										<option key={area.id} value={area.id}>
											{area.nameEn}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="locality">{t("locations.locality")}</Label>
								<select
									id="locality"
									value={localityId}
									onChange={(e) => setLocalityId(e.target.value)}
									className="h-10 w-full rounded-md border bg-background px-3 text-sm"
									disabled={!subAreaId}
									required
								>
									<option value="">{t("common.select")}</option>
									{availableLocalities.map((locality) => (
										<option key={locality.id} value={locality.id}>
											{locality.nameEn}
										</option>
									))}
								</select>
							</div>
						</>
					)}
					<div className="space-y-2">
						<Label htmlFor="phone">{t("stations.phone")}</Label>
						<Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519XXXXXXXX" />
					</div>
					<div className="flex justify-end md:col-span-2">
						<Button type="submit" disabled={create.isPending || !canSubmit}>
							{create.isPending ? t("common.saving") : t("common.create")}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
});
StationCreateForm.displayName = "StationCreateForm";

const StationRow = React.memo(
	({
		station,
		agentOptions,
	}: {
		readonly station: Station;
		readonly agentOptions: readonly { id: string; name: string }[];
	}) => {
		const { t } = useTranslation();
		const update = useUpdateStation(station.id);
		const assign = useAssignStationAgent(station.id);
		const remove = useRemoveStationAssignment(station.id);
		const { data: assignments } = useStationAssignments(station.id);
		const [phone, setPhone] = React.useState(station.phone ?? "");
		const [agentId, setAgentId] = React.useState("");
		const [error, setError] = React.useState("");

		const agentNameById = React.useMemo(
			() => new Map(agentOptions.map((agent) => [agent.id, agent.name])),
			[agentOptions],
		);

		const onSave = React.useCallback(async () => {
			setError("");
			try {
				await update.mutateAsync({ phone: phone || null });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		}, [phone, t, update]);

		const onToggleActive = React.useCallback(async () => {
			setError("");
			try {
				await update.mutateAsync({ active: !station.active });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		}, [station.active, t, update]);

		const onAssign = React.useCallback(async () => {
			if (!agentId) return;
			setError("");
			try {
				await assign.mutateAsync(agentId);
				setAgentId("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		}, [agentId, assign, t]);

		return (
			<tr className="border-t align-top">
				<td className="py-2.5">
					<div className="font-medium">{station.name}</div>
					<div className="text-xs text-muted-foreground">{station.address}</div>
					{error && <p className="mt-1 text-xs text-destructive">{error}</p>}
				</td>
				<td>{station.woreda}</td>
				<td>{station.custom ? t("stations.custom") : t("stations.standard")}</td>
				<td>
					<div className="flex max-w-48 gap-2">
						<Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519XXXXXXXX" />
						<Button type="button" size="sm" variant="outline" disabled={update.isPending} onClick={onSave}>
							{t("common.save")}
						</Button>
					</div>
				</td>
				<td>
					<Badge variant={station.active ? "default" : "secondary"} className="text-[10px]">
						{station.active ? t("common.yes") : t("common.no")}
					</Badge>
				</td>
				<td>
					<div className="space-y-2">
						<div className="flex flex-wrap gap-1">
							{assignments?.map((assignment) => (
								<span key={assignment.id} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs">
									{agentNameById.get(assignment.userId) ?? assignment.userId}
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-5 px-1 text-xs"
										disabled={remove.isPending}
										onClick={() => remove.mutate(assignment.id)}
									>
										{t("staffUsers.revoke")}
									</Button>
								</span>
							))}
						</div>
						<div className="flex gap-2">
							<select
								value={agentId}
								onChange={(e) => setAgentId(e.target.value)}
								className="h-9 rounded-md border bg-background px-2 text-sm"
							>
								<option value="">{t("stations.assignAgent")}</option>
								{agentOptions.map((agent) => (
									<option key={agent.id} value={agent.id}>
										{agent.name}
									</option>
								))}
							</select>
							<Button type="button" size="sm" disabled={!agentId || assign.isPending} onClick={onAssign}>
								{t("stations.assignAgent")}
							</Button>
						</div>
					</div>
				</td>
				<td className="text-right">
					<Button type="button" size="sm" variant="outline" disabled={update.isPending} onClick={onToggleActive}>
						{station.active ? t("stations.deactivate") : t("stations.activate")}
					</Button>
				</td>
			</tr>
		);
	},
);
StationRow.displayName = "StationRow";

const StationsPage = React.memo(() => {
	const { t } = useTranslation();
	const { data, isLoading } = useStations(true);
	const { data: staffUsers } = useStaffUsers();
	const agentOptions = React.useMemo(
		() =>
			(staffUsers ?? [])
				.filter(
					(user) =>
						user.active &&
						(user.role === "agent" || user.roleAssignments.some((assignment) => assignment.role === "agent")),
				)
				.map((user) => ({ id: user.id, name: user.name })),
		[staffUsers],
	);

	return (
		<div className="max-w-5xl space-y-4">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground transition hover:text-foreground">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="mt-2 text-2xl font-bold tracking-tight">{t("stations.title")}</h1>
			</div>
			<StationCreateForm />
			<Card>
				<CardHeader>
					<CardTitle>{t("stations.all")}</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
					<table className="w-full text-sm">
						<thead className="border-b text-left text-xs uppercase text-muted-foreground">
							<tr>
								<th className="py-2 font-medium">{t("stations.name")}</th>
								<th className="font-medium">{t("stations.woreda")}</th>
								<th className="font-medium">{t("stations.type")}</th>
								<th className="font-medium">{t("stations.phone")}</th>
								<th className="font-medium">{t("stations.active")}</th>
								<th className="font-medium">{t("stations.agents")}</th>
								<th className="text-right font-medium">{t("common.actions")}</th>
							</tr>
						</thead>
						<tbody>
							{data?.map((station) => (
								<StationRow key={station.id} station={station} agentOptions={agentOptions} />
							))}
						</tbody>
					</table>
					{data && data.length === 0 && (
						<p className="py-6 text-center text-sm text-muted-foreground">{t("stations.empty")}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
});
StationsPage.displayName = "StationsPage";

export const Route = createFileRoute("/staff-admin/stations")({
	component: StationsPage,
});
