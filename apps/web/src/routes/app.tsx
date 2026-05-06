import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { WezLogo } from "@/components/branding/WezLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CustomerAppLayout = React.memo(() => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	const onSignOut = React.useCallback(async () => {
		await authClient.signOut();
		window.location.href = "/";
	}, []);

	React.useEffect(() => {
		if (!isPending && !session?.user) {
			navigate({ to: "/login" });
		}
	}, [isPending, session, navigate]);

	if (isPending || !session?.user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Skeleton className="h-8 w-56" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b bg-background/95">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
					<div className="flex items-center gap-2 text-primary">
						<WezLogo variant="mark" className="size-8" />
						<div className="leading-tight">
							<div className="font-bold tracking-tight">Wez</div>
							<div className="text-xs text-muted-foreground">{t("app.shell")}</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<Button variant="ghost" size="sm" onClick={onSignOut}>
							{t("common.signOut")}
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-6 py-8">
				<Outlet />
			</main>
		</div>
	);
});
CustomerAppLayout.displayName = "CustomerAppLayout";

export const Route = createFileRoute("/app")({
	component: CustomerAppLayout,
});
