import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { WezLogo } from "#components/branding/WezLogo";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RootIndex = React.memo(() => {
	const { t } = useTranslation();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Skeleton className="h-8 w-48" />
			</div>
		);
	}

	if (session) return <Navigate to="/app/dashboard" />;

	return (
		<div className="min-h-screen flex flex-col">
			<header className="border-b">
				<div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-2 text-primary">
						<WezLogo variant="mark" className="size-8" />
						<span className="font-bold text-xl tracking-tight">Wez</span>
					</div>
					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<Link to="/login">
							<Button variant="ghost" size="sm">
								{t("landing.signIn")}
							</Button>
						</Link>
					</div>
				</div>
			</header>

			<main className="flex-1">
				<section className="max-w-4xl mx-auto px-6 py-16 text-center">
					<h1 className="text-4xl md:text-5xl font-bold tracking-tight">
						{t("landing.heroTitle")}
					</h1>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						{t("landing.heroBody")}
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link to="/signup">
							<Button size="lg">{t("landing.employerCta")}</Button>
						</Link>
						<Link to="/staff-login">
							<Button size="lg" variant="outline">
								{t("landing.staffCta")}
							</Button>
						</Link>
					</div>
				</section>

				<section className="max-w-5xl mx-auto px-6 pb-20">
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardHeader>
								<CardTitle>{t("landing.stationLedTitle")}</CardTitle>
								<CardDescription>{t("landing.stationLedBody")}</CardDescription>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground">{t("landing.stationLedDetail")}</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>{t("landing.verifiedTitle")}</CardTitle>
								<CardDescription>{t("landing.verifiedBody")}</CardDescription>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground">{t("landing.verifiedDetail")}</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>{t("landing.auditTitle")}</CardTitle>
								<CardDescription>{t("landing.auditBody")}</CardDescription>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground">{t("landing.auditDetail")}</CardContent>
						</Card>
					</div>
				</section>
			</main>

			<footer className="border-t">
				<div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted-foreground text-center">
					&copy; {new Date().getFullYear()} Wez · {t("brand.tagline")}
				</div>
			</footer>
		</div>
	);
});
RootIndex.displayName = "RootIndex";

export const Route = createFileRoute("/")({
	component: RootIndex,
});
