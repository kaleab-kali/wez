import { WifiOff01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { WezLogo } from "@/components/branding/WezLogo";
import { Button } from "@/components/ui/button";

const OfflineRoute = React.memo(() => {
	const { t } = useTranslation();

	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
			<section className="w-full max-w-md rounded-4xl border bg-card p-6 text-card-foreground shadow-sm">
				<div className="mb-6 flex items-center justify-between gap-3">
					<WezLogo className="h-10 w-24 text-primary" />
					<div className="flex size-10 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
						<HugeiconsIcon icon={WifiOff01Icon} className="size-5" />
					</div>
				</div>
				<h1 className="font-heading text-2xl font-semibold tracking-tight">{t("pwa.offlineTitle")}</h1>
				<p className="mt-3 text-sm leading-6 text-muted-foreground">{t("pwa.offlineBody")}</p>
				<div className="mt-6 flex flex-wrap gap-2">
					<Button asChild>
						<Link to="/launch">{t("pwa.tryAgain")}</Link>
					</Button>
					<Button asChild variant="outline">
						<Link to="/">{t("pwa.homeAction")}</Link>
					</Button>
				</div>
			</section>
		</main>
	);
});
OfflineRoute.displayName = "OfflineRoute";

export const Route = createFileRoute("/offline")({
	component: OfflineRoute,
});
