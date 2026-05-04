import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WezLogo } from "#components/branding/WezLogo";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
	component: RootIndex,
});

function RootIndex() {
	const { t } = useTranslation();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Skeleton className="h-8 w-48" />
			</div>
		);
	}

	if (session) return <Navigate to="/dashboard" />;

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
				<section className="max-w-4xl mx-auto px-6 py-20 text-center">
					<h1 className="text-4xl md:text-5xl font-bold tracking-tight">
						{t("landing.heroTitle")}
					</h1>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						{t("landing.heroBody")}
					</p>
				</section>

				<section className="max-w-4xl mx-auto px-6 pb-20">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center mb-6">
						{t("landing.chooseRole")}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Link to="/login-phone" className="block group">
							<Card className="h-full transition-all group-hover:border-primary group-hover:shadow-md">
								<CardHeader>
									<CardTitle>{t("landing.workerTitle")}</CardTitle>
									<CardDescription>{t("landing.workerBody")}</CardDescription>
								</CardHeader>
								<CardContent>
									<Button variant="outline" className="w-full">
										{t("landing.workerCta")}
									</Button>
								</CardContent>
							</Card>
						</Link>

						<Link to="/signup-employer" className="block group">
							<Card className="h-full transition-all group-hover:border-primary group-hover:shadow-md">
								<CardHeader>
									<CardTitle>{t("landing.employerTitle")}</CardTitle>
									<CardDescription>{t("landing.employerBody")}</CardDescription>
								</CardHeader>
								<CardContent>
									<Button variant="outline" className="w-full">
										{t("landing.employerCta")}
									</Button>
								</CardContent>
							</Card>
						</Link>

						<Link to="/login" className="block group">
							<Card className="h-full transition-all group-hover:border-primary group-hover:shadow-md">
								<CardHeader>
									<CardTitle>{t("landing.staffTitle")}</CardTitle>
									<CardDescription>{t("landing.staffBody")}</CardDescription>
								</CardHeader>
								<CardContent>
									<Button variant="outline" className="w-full">
										{t("landing.staffCta")}
									</Button>
								</CardContent>
							</Card>
						</Link>
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
}
