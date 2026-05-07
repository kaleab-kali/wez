import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { type Location, useCreateLocation, useLocations } from "#features/locations/api/location.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOCATION_KINDS = ["admin_area", "sub_area", "locality"] as const;
const LOCATION_TYPES: Record<Location["kind"], readonly string[]> = {
	admin_area: ["region", "city_admin"],
	sub_area: ["subcity", "zone"],
	locality: ["woreda", "kebele", "custom"],
};

const formatKind = (kind: string) => kind.replace(/_/g, " ");

const LocationCreateForm = React.memo(() => {
	const { t } = useTranslation();
	const create = useCreateLocation();
	const [kind, setKind] = React.useState<Location["kind"]>("admin_area");
	const [type, setType] = React.useState("city_admin");
	const [parentId, setParentId] = React.useState("");
	const [code, setCode] = React.useState("");
	const [nameEn, setNameEn] = React.useState("");
	const [nameAm, setNameAm] = React.useState("");
	const [error, setError] = React.useState("");
	const { data: parentOptions } = useLocations({
		kind: kind === "sub_area" ? "admin_area" : kind === "locality" ? "sub_area" : undefined,
	});

	const onKindChange = React.useCallback((value: Location["kind"]) => {
		setKind(value);
		setType(LOCATION_TYPES[value][0]);
		setParentId("");
	}, []);

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			try {
				await create.mutateAsync({
					code,
					kind,
					type,
					nameEn,
					nameAm: nameAm || undefined,
					parentId: parentId || undefined,
				});
				setCode("");
				setNameEn("");
				setNameAm("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[code, create, kind, nameAm, nameEn, parentId, t, type],
	);

	const parentRequired = kind !== "admin_area";
	const canSubmit = code && nameEn && type && (!parentRequired || parentId);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("locations.create")}</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
					{error && (
						<div className="rounded bg-destructive/10 p-2.5 text-sm text-destructive md:col-span-3">{error}</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="location-kind">{t("locations.level")}</Label>
						<select
							id="location-kind"
							value={kind}
							onChange={(e) => onKindChange(e.target.value as Location["kind"])}
							className="h-10 w-full rounded-md border bg-background px-3 text-sm"
						>
							{LOCATION_KINDS.map((item) => (
								<option key={item} value={item}>
									{t(`locations.${item}`)}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="location-type">{t("locations.type")}</Label>
						<select
							id="location-type"
							value={type}
							onChange={(e) => setType(e.target.value)}
							className="h-10 w-full rounded-md border bg-background px-3 text-sm"
						>
							{LOCATION_TYPES[kind].map((item) => (
								<option key={item} value={item}>
									{formatKind(item)}
								</option>
							))}
						</select>
					</div>
					{parentRequired && (
						<div className="space-y-2">
							<Label htmlFor="location-parent">{t("locations.parent")}</Label>
							<select
								id="location-parent"
								value={parentId}
								onChange={(e) => setParentId(e.target.value)}
								className="h-10 w-full rounded-md border bg-background px-3 text-sm"
								required
							>
								<option value="">{t("common.select")}</option>
								{parentOptions?.map((item) => (
									<option key={item.id} value={item.id}>
										{item.nameEn}
									</option>
								))}
							</select>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="location-code">{t("locations.code")}</Label>
						<Input id="location-code" value={code} onChange={(e) => setCode(e.target.value)} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="location-name-en">{t("locations.nameEn")}</Label>
						<Input id="location-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="location-name-am">{t("locations.nameAm")}</Label>
						<Input id="location-name-am" value={nameAm} onChange={(e) => setNameAm(e.target.value)} />
					</div>
					<div className="flex justify-end md:col-span-3">
						<Button type="submit" disabled={create.isPending || !canSubmit}>
							{create.isPending ? t("common.saving") : t("common.create")}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
});
LocationCreateForm.displayName = "LocationCreateForm";

const LocationsTable = React.memo(({ rows }: { readonly rows: readonly Location[] }) => {
	const { t } = useTranslation();
	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("locations.all")}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="border-b text-left text-xs uppercase text-muted-foreground">
							<tr>
								<th className="py-2 font-medium">{t("locations.nameEn")}</th>
								<th className="font-medium">{t("locations.level")}</th>
								<th className="font-medium">{t("locations.type")}</th>
								<th className="font-medium">{t("locations.code")}</th>
								<th className="font-medium">{t("stations.active")}</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((location) => (
								<tr key={location.id} className="border-t">
									<td className="py-2.5 font-medium">{location.nameEn}</td>
									<td className="capitalize">{formatKind(location.kind)}</td>
									<td className="capitalize">{formatKind(location.type)}</td>
									<td className="font-mono text-xs">{location.code}</td>
									<td>
										<Badge variant={location.active ? "default" : "secondary"} className="text-[10px]">
											{location.active ? t("common.yes") : t("common.no")}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("locations.empty")}</p>}
			</CardContent>
		</Card>
	);
});
LocationsTable.displayName = "LocationsTable";

const LocationsPage = React.memo(() => {
	const { t } = useTranslation();
	const { data, isLoading } = useLocations({ includeInactive: true });

	return (
		<div className="max-w-5xl space-y-4">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground transition hover:text-foreground">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="mt-2 text-2xl font-bold tracking-tight">{t("locations.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("locations.subtitle")}</p>
			</div>
			<LocationCreateForm />
			{isLoading ? (
				<p className="text-sm text-muted-foreground">{t("common.loading")}</p>
			) : (
				<LocationsTable rows={data ?? []} />
			)}
		</div>
	);
});
LocationsPage.displayName = "LocationsPage";

export const Route = createFileRoute("/staff-admin/locations")({
	component: LocationsPage,
});
