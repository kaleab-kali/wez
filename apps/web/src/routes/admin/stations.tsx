import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useCreateStation, useStations } from "#features/stations/api/station.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/stations")({
	component: StationsPage,
});

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;

const StationCreateForm = React.memo(
	() => {
		const { t } = useTranslation();
		const create = useCreateStation();
		const [name, setName] = React.useState("");
		const [woreda, setWoreda] = React.useState("");
		const [address, setAddress] = React.useState("");
		const [phone, setPhone] = React.useState("");
		const [error, setError] = React.useState("");

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
						name,
						woreda,
						address,
						phone: phone || undefined,
					});
					setName("");
					setWoreda("");
					setAddress("");
					setPhone("");
				} catch (err) {
					setError(err instanceof Error ? err.message : t("common.error"));
				}
			},
			[name, woreda, address, phone, create, t],
		);

		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("stations.create")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{error && (
							<div className="md:col-span-2 rounded bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">{t("stations.name")}</Label>
							<Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label htmlFor="woreda">{t("stations.woreda")}</Label>
							<Input id="woreda" value={woreda} onChange={(e) => setWoreda(e.target.value)} required />
						</div>
						<div className="space-y-2 md:col-span-2">
							<Label htmlFor="address">{t("stations.address")}</Label>
							<Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label htmlFor="phone">{t("stations.phone")}</Label>
							<Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2519XXXXXXXX" />
						</div>
						<div className="md:col-span-2 flex justify-end">
							<Button type="submit" disabled={create.isPending}>
								{create.isPending ? t("common.saving") : t("common.create")}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		);
	},
	() => true,
);
StationCreateForm.displayName = "StationCreateForm";

function StationsPage() {
	const { t } = useTranslation();
	const { data, isLoading } = useStations(true);

	return (
		<div className="space-y-4 max-w-4xl">
			<div>
				<Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground transition">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="text-2xl font-bold tracking-tight mt-2">{t("stations.title")}</h1>
			</div>
			<StationCreateForm />
			<Card>
				<CardHeader>
					<CardTitle>{t("stations.all")}</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
					<table className="w-full text-sm">
						<thead className="text-left text-xs uppercase text-muted-foreground border-b">
							<tr>
								<th className="py-2 font-medium">{t("stations.name")}</th>
								<th className="font-medium">{t("stations.woreda")}</th>
								<th className="font-medium">{t("stations.phone")}</th>
								<th className="font-medium">{t("stations.active")}</th>
							</tr>
						</thead>
						<tbody>
							{data?.map((s) => (
								<tr key={s.id} className="border-t">
									<td className="py-2.5 font-medium">{s.name}</td>
									<td>{s.woreda}</td>
									<td className="font-mono text-xs">{s.phone ?? "—"}</td>
									<td>
										<Badge variant={s.active ? "default" : "secondary"} className="text-[10px]">
											{s.active ? t("common.yes") : t("common.no")}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{data && data.length === 0 && (
						<p className="text-sm text-muted-foreground py-6 text-center">{t("stations.empty")}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
