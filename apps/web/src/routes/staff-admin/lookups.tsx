import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminLookups, useCreateLookup, useUpdateLookup } from "#features/lookups/api/lookup.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff-admin/lookups")({
	component: LookupsPage,
});

const KINDS = ["languages", "religions"] as const;

const RowToggle = React.memo(
	({ id, archived }: { readonly id: string; readonly archived: boolean }) => {
		const update = useUpdateLookup(id);
		return (
			<Button
				variant="ghost"
				size="sm"
				onClick={() => update.mutate({ archived: !archived })}
				disabled={update.isPending}
			>
				{archived ? "Restore" : "Archive"}
			</Button>
		);
	},
	(p, n) => p.id === n.id && p.archived === n.archived,
);
RowToggle.displayName = "RowToggle";

const KindPanel = React.memo(
	({ kind }: { readonly kind: string }) => {
		const { data, isLoading } = useAdminLookups(kind, true);
		const create = useCreateLookup();
		const [value, setValue] = React.useState("");
		const [labelEn, setLabelEn] = React.useState("");
		const [labelAm, setLabelAm] = React.useState("");
		const [error, setError] = React.useState("");

		const onSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				try {
					await create.mutateAsync({
						kind,
						value: value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
						labelEn,
						labelAm: labelAm || undefined,
					});
					setValue("");
					setLabelEn("");
					setLabelAm("");
				} catch (err) {
					setError(err instanceof Error ? err.message : "Could not create");
				}
			},
			[kind, value, labelEn, labelAm, create],
		);

		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base capitalize">{kind}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
						{error && (
							<div className="md:col-span-4 rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>
						)}
						<div className="space-y-1.5">
							<Label className="text-xs">Value</Label>
							<Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="snake_case" required />
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Label (EN)</Label>
							<Input value={labelEn} onChange={(e) => setLabelEn(e.target.value)} required />
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Label (አማ)</Label>
							<Input value={labelAm} onChange={(e) => setLabelAm(e.target.value)} />
						</div>
						<Button type="submit" disabled={create.isPending}>
							{create.isPending ? "Saving..." : "Add"}
						</Button>
					</form>
					{isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="text-left text-xs uppercase text-muted-foreground border-b">
								<tr>
									<th className="py-2 font-medium">Value</th>
									<th className="font-medium">Label (EN)</th>
									<th className="font-medium">Label (አማ)</th>
									<th className="font-medium">Order</th>
									<th className="font-medium">Status</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{data?.map((l) => (
									<tr key={l.id} className="border-t">
										<td className="py-2 font-mono text-xs">{l.value}</td>
										<td>{l.labelEn}</td>
										<td>{l.labelAm ?? "—"}</td>
										<td className="font-mono text-xs">{l.sortOrder}</td>
										<td>
											{l.archived ? (
												<Badge variant="secondary" className="text-[10px]">
													archived
												</Badge>
											) : (
												<Badge className="text-[10px]">active</Badge>
											)}
										</td>
										<td className="text-right">
											<RowToggle id={l.id} archived={l.archived} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{data && data.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No entries.</p>}
				</CardContent>
			</Card>
		);
	},
	(p, n) => p.kind === n.kind,
);
KindPanel.displayName = "KindPanel";

function LookupsPage() {
	const { t } = useTranslation();
	const [activeKind, setActiveKind] = React.useState<string>(KINDS[0]);

	return (
		<div className="space-y-4 max-w-5xl">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground hover:text-foreground transition">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="text-2xl font-bold tracking-tight mt-2">Lookups</h1>
				<p className="text-sm text-muted-foreground mt-1">
					HQ-managed reference data used in worker registration and filters.
				</p>
			</div>
			<div className="flex gap-2 border-b">
				{KINDS.map((k) => (
					<button
						type="button"
						key={k}
						onClick={() => setActiveKind(k)}
						className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
							activeKind === k
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<span className="capitalize">{k}</span>
					</button>
				))}
			</div>
			<KindPanel kind={activeKind} />
		</div>
	);
}
