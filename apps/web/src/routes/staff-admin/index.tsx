import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Book02Icon,
	Coins01Icon,
	SecurityIcon,
	StoreLocation02Icon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/staff-admin/")({
	component: AdminDashboard,
});

const TileLink = React.memo(
	({
		to,
		icon,
		title,
		description,
		badge,
	}: {
		readonly to: string;
		readonly icon: typeof StoreLocation02Icon;
		readonly title: string;
		readonly description: string;
		readonly badge?: { label: string; variant: "default" | "destructive" | "secondary" | "outline" };
	}) => (
		<Link to={to} className="block group">
			<Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-sm">
				<CardHeader className="flex flex-row items-start gap-4 space-y-0">
					<div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
						<HugeiconsIcon icon={icon} className="size-5" />
					</div>
					<div className="space-y-1 flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
							{badge && (
								<Badge variant={badge.variant} className="text-[10px]">
									{badge.label}
								</Badge>
							)}
						</div>
						<CardDescription className="text-xs">{description}</CardDescription>
					</div>
				</CardHeader>
			</Card>
		</Link>
	),
	(p, n) => p.to === n.to && p.title === n.title && p.badge?.label === n.badge?.label,
);
TileLink.displayName = "TileLink";

function AdminDashboard() {
	const { t } = useTranslation();
	const { data: session } = useAdminSession();
	const user = session?.user as { name?: string; role?: string; twoFactorEnabled?: boolean } | undefined;
	const role = user?.role ?? "support";
	const twoFactorEnabled = user?.twoFactorEnabled ?? false;

	return (
		<div className="space-y-8 max-w-6xl">
			<header className="flex items-start justify-between flex-wrap gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{t("admin.consoleTitle")}</h1>
					<p className="text-muted-foreground mt-1.5">
						{t("admin.welcome", { name: user?.name ?? "" })}
					</p>
				</div>
				<Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
					{role}
				</Badge>
			</header>

			<section className="space-y-3">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					{t("admin.operations")}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<TileLink
						to="/staff-admin/stations"
						icon={StoreLocation02Icon}
						title={t("admin.stationsAndAgents")}
						description={t("admin.nav.stations")}
					/>
					<TileLink
						to="/staff-admin/role-catalog"
						icon={Coins01Icon}
						title={t("admin.roleCatalogLink")}
						description={t("roleCatalog.subtitle")}
					/>
					<TileLink
						to="/staff-admin/lookups"
						icon={Book02Icon}
						title={t("admin.nav.lookups")}
						description="Languages, woredas, religions"
					/>
					<TileLink
						to="/staff-admin/2fa"
						icon={SecurityIcon}
						title={t("admin.twoFactor")}
						description={twoFactorEnabled ? t("admin.manage") : t("admin.enable2fa")}
						badge={
							twoFactorEnabled
								? { label: t("admin.twoFactorEnabled"), variant: "default" }
								: { label: t("admin.twoFactorDisabled"), variant: "destructive" }
						}
					/>
					<TileLink
						to="/staff-admin/sessions"
						icon={UserMultipleIcon}
						title={t("admin.sessions")}
						description={t("admin.viewSessions")}
					/>
				</div>
			</section>
		</div>
	);
}
