import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminRoles, useCreateRole } from "#features/role-catalog/api/role.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/role-catalog")({
	component: RoleCatalogPage,
});

const formatBirr = (cents: string) => `${(Number(cents) / 100).toLocaleString()} ETB`;

const RoleCreateForm = React.memo(
	() => {
		const { t } = useTranslation();
		const create = useCreateRole();
		const [id, setId] = React.useState("");
		const [name, setName] = React.useState("");
		const [category, setCategory] = React.useState("");
		const [commType, setCommType] = React.useState<"flat" | "percent">("flat");
		const [commValue, setCommValue] = React.useState(0);
		const [salaryMin, setSalaryMin] = React.useState(0);
		const [salaryMax, setSalaryMax] = React.useState(0);
		const [error, setError] = React.useState("");

		const onSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				try {
					await create.mutateAsync({
						id,
						name,
						category,
						commType,
						commValue,
						salaryMinCents: salaryMin * 100,
						salaryMaxCents: salaryMax * 100,
					});
					setId("");
					setName("");
					setCategory("");
					setCommValue(0);
					setSalaryMin(0);
					setSalaryMax(0);
				} catch (err) {
					setError(err instanceof Error ? err.message : t("common.error"));
				}
			},
			[id, name, category, commType, commValue, salaryMin, salaryMax, create, t],
		);

		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("roleCatalog.create")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{error && (
							<div className="md:col-span-2 rounded bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="id">{t("roleCatalog.id")}</Label>
							<Input
								id="id"
								value={id}
								onChange={(e) => setId(e.target.value)}
								placeholder={t("roleCatalog.idPlaceholder")}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="name">{t("roleCatalog.name")}</Label>
							<Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label htmlFor="category">{t("roleCatalog.category")}</Label>
							<Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label htmlFor="commType">{t("roleCatalog.commType")}</Label>
							<select
								id="commType"
								value={commType}
								onChange={(e) => setCommType(e.target.value as "flat" | "percent")}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="flat">{t("roleCatalog.commFlat")}</option>
								<option value="percent">{t("roleCatalog.commPercent")}</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="commValue">{t("roleCatalog.commValue")}</Label>
							<Input
								id="commValue"
								type="number"
								min={0}
								value={commValue}
								onChange={(e) => setCommValue(Number(e.target.value))}
								required
							/>
						</div>
						<div />
						<div className="space-y-2">
							<Label htmlFor="salaryMin">{t("roleCatalog.salaryMin")}</Label>
							<Input
								id="salaryMin"
								type="number"
								min={0}
								value={salaryMin}
								onChange={(e) => setSalaryMin(Number(e.target.value))}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="salaryMax">{t("roleCatalog.salaryMax")}</Label>
							<Input
								id="salaryMax"
								type="number"
								min={0}
								value={salaryMax}
								onChange={(e) => setSalaryMax(Number(e.target.value))}
								required
							/>
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
RoleCreateForm.displayName = "RoleCreateForm";

function RoleCatalogPage() {
	const { t } = useTranslation();
	const { data, isLoading } = useAdminRoles(true);

	return (
		<div className="space-y-4 max-w-5xl">
			<div>
				<Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground transition">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="text-2xl font-bold tracking-tight mt-2">{t("roleCatalog.title")}</h1>
				<p className="text-sm text-muted-foreground mt-1">{t("roleCatalog.subtitle")}</p>
			</div>
			<RoleCreateForm />
			<Card>
				<CardHeader>
					<CardTitle>{t("roleCatalog.all")}</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="text-left text-xs uppercase text-muted-foreground border-b">
								<tr>
									<th className="py-2 font-medium">ID</th>
									<th className="font-medium">{t("roleCatalog.name")}</th>
									<th className="font-medium">{t("roleCatalog.category")}</th>
									<th className="font-medium">{t("roleCatalog.commission")}</th>
									<th className="font-medium">{t("roleCatalog.salary")}</th>
									<th className="font-medium">{t("stations.active")}</th>
								</tr>
							</thead>
							<tbody>
								{data?.map((r) => (
									<tr key={r.id} className="border-t">
										<td className="py-2.5 font-mono text-xs">{r.id}</td>
										<td>{r.name}</td>
										<td className="text-muted-foreground">{r.category}</td>
										<td className="font-mono text-xs">
											{r.commType === "flat" ? `${r.commValue} ETB` : `${r.commValue}%`}
										</td>
										<td className="font-mono text-xs">
											{formatBirr(r.salaryMinCents)} - {formatBirr(r.salaryMaxCents)}
										</td>
										<td>
											<Badge variant={r.active ? "default" : "secondary"} className="text-[10px]">
												{r.active ? t("common.yes") : t("common.no")}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{data && data.length === 0 && (
						<p className="text-sm text-muted-foreground py-6 text-center">{t("roleCatalog.empty")}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
