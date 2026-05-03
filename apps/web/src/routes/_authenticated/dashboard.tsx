import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { authClient } from "#shared/lib/auth-client";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role ?? "worker";

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h1 className="text-3xl font-bold">{t("dashboard.welcome")}</h1>
				<p className="text-muted-foreground mt-2">
					{t("dashboard.greeting", { name: session?.user?.name })}
				</p>
			</div>
			<div className="rounded-lg border p-6 bg-muted/30">
				<p className="text-sm text-muted-foreground">{t("dashboard.role")}</p>
				<p className="text-xl font-mono">{role}</p>
			</div>
			<div className="rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-2">{t("dashboard.phase1a.title")}</h2>
				<p className="text-sm text-muted-foreground">{t("dashboard.phase1a.body")}</p>
			</div>
		</div>
	);
}
