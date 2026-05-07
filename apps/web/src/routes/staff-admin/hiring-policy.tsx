import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useHiringPolicy, useUpdateHiringPolicy } from "#features/platform-settings/api/platform-settings.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HiringPolicyPage = React.memo(() => {
	const { t } = useTranslation();
	const { data } = useHiringPolicy();
	const update = useUpdateHiringPolicy();
	const [days, setDays] = React.useState(1);
	const [error, setError] = React.useState("");

	React.useEffect(() => {
		if (data) setDays(data.hireRequestExpiryDays);
	}, [data]);

	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			setError("");
			try {
				await update.mutateAsync({ hireRequestExpiryDays: days });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[days, t, update],
	);

	return (
		<div className="max-w-3xl space-y-5">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">{t("platformSettings.hiringPolicy")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("platformSettings.hiringPolicyBody")}</p>
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("platformSettings.expiryPolicy")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-4">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="expiryDays">{t("platformSettings.hireRequestExpiryDays")}</Label>
							<Input
								id="expiryDays"
								type="number"
								min={1}
								value={days}
								onChange={(event) => setDays(Number(event.target.value))}
							/>
						</div>
						<Button type="submit" disabled={update.isPending}>
							{update.isPending ? t("common.saving") : t("common.save")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
});
HiringPolicyPage.displayName = "HiringPolicyPage";

export const Route = createFileRoute("/staff-admin/hiring-policy")({
	component: HiringPolicyPage,
});
