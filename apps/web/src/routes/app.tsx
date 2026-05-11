import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { WezLogo } from "@/components/branding/WezLogo";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);

const CustomerAppLayout = React.memo(() => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const { data: session, isPending } = authClient.useSession();
	const { theme, setTheme } = useTheme();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");
	const isWorker = role === "worker";

	const onSignOut = React.useCallback(async () => {
		await authClient.signOut();
		window.location.href = "/";
	}, []);

	const onToggleTheme = React.useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [theme, setTheme]);

	React.useEffect(() => {
		if (!isPending && !session?.user) {
			navigate({ to: "/login" });
		}
	}, [isPending, session, navigate]);

	React.useEffect(() => {
		if (!isPending && isWorker && location.pathname.startsWith("/app/jobs")) {
			navigate({ to: "/app/requests", replace: true });
		}
	}, [isPending, isWorker, location.pathname, navigate]);

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
				<div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
					<div className="flex items-center gap-2 text-primary">
						<WezLogo variant="mark" className="size-8" />
						<div className="leading-tight">
							<div className="font-bold tracking-tight">Wez</div>
							<div className="text-xs text-muted-foreground">{t("app.shell")}</div>
						</div>
					</div>
					<nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-none md:w-auto">
						<CustomerNavLink to="/app/dashboard" active={location.pathname === "/app/dashboard"}>
							{t("nav.dashboard")}
						</CustomerNavLink>
						{isEmployer && (
							<CustomerNavLink to="/app/workers" active={location.pathname.startsWith("/app/workers")}>
								{t("app.workers")}
							</CustomerNavLink>
						)}
						{isEmployer && (
							<CustomerNavLink to="/app/jobs" active={location.pathname.startsWith("/app/jobs")}>
								{t("app.jobs")}
							</CustomerNavLink>
						)}
						{(isEmployer || isWorker) && (
							<CustomerNavLink to="/app/requests" active={location.pathname.startsWith("/app/requests")}>
								{t("app.requests")}
							</CustomerNavLink>
						)}
						{(isEmployer || isWorker) && (
							<CustomerNavLink to="/app/complaints" active={location.pathname.startsWith("/app/complaints")}>
								{t("app.complaints")}
							</CustomerNavLink>
						)}
						{isWorker && (
							<CustomerNavLink to="/app/profile" active={location.pathname.startsWith("/app/profile")}>
								{t("app.profile")}
							</CustomerNavLink>
						)}
						{isEmployer && (
							<CustomerNavLink to="/app/referrals" active={location.pathname.startsWith("/app/referrals")}>
								{t("referrals.title")}
							</CustomerNavLink>
						)}
					</nav>
					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={theme === "dark" ? t("common.lightMode") : t("common.darkMode")}
							onClick={onToggleTheme}
						>
							<HugeiconsIcon icon={theme === "dark" ? Sun03Icon : Moon02Icon} className="size-4" />
						</Button>
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

const CustomerNavLink = React.memo(
	({ to, active, children }: { readonly to: string; readonly active: boolean; readonly children: React.ReactNode }) => (
		<Link
			to={to}
			className={`rounded-md px-3 py-2 text-sm transition ${
				active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
			}`}
		>
			{children}
		</Link>
	),
);
CustomerNavLink.displayName = "CustomerNavLink";

export const Route = createFileRoute("/app")({
	component: CustomerAppLayout,
});
