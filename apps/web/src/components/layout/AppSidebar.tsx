import {
	DashboardSquare01Icon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useLocation } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { WezLogo } from "#components/branding/WezLogo";
import { authClient } from "#shared/lib/auth-client";
import { UserMenu } from "#shared/components/UserMenu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
	labelKey: string;
	to: string;
	icon: typeof DashboardSquare01Icon;
};

const NAV_ITEMS: Record<string, ReadonlyArray<NavItem>> = {
	worker: [{ labelKey: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon }],
	employer_business: [
		{ labelKey: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon },
		{ labelKey: "nav.workers", to: "/workers", icon: UserMultipleIcon },
	],
	employer_household: [
		{ labelKey: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon },
		{ labelKey: "nav.workers", to: "/workers", icon: UserMultipleIcon },
	],
	agent: [
		{ labelKey: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon },
		{ labelKey: "nav.workers", to: "/workers", icon: UserMultipleIcon },
	],
	station_supervisor: [
		{ labelKey: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon },
		{ labelKey: "nav.workers", to: "/workers", icon: UserMultipleIcon },
	],
	instructor: [{ labelKey: "nav.dashboard", to: "/dashboard", icon: DashboardSquare01Icon }],
};

const getNav = (role: string | undefined): ReadonlyArray<NavItem> =>
	NAV_ITEMS[role ?? "worker"] ?? [];

export const AppSidebar = React.memo(
	() => {
		const { t } = useTranslation();
		const { data: session } = authClient.useSession();
		const role = (session?.user as { role?: string } | undefined)?.role;
		const items = getNav(role);
		const location = useLocation();

		return (
			<Sidebar collapsible="icon" className="border-r">
				<SidebarHeader className="border-b">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" className="hover:bg-transparent">
								<div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/10 text-primary p-1.5">
									<WezLogo variant="mark" className="size-full" />
								</div>
								<div className="flex flex-col gap-0 text-left leading-tight">
									<span className="font-bold text-base tracking-tight">Wez</span>
									<span className="text-[11px] text-muted-foreground">
										{t("brand.tagline")}
									</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>{t("nav.workspace")}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{items.map((item) => {
									const active =
										item.to === "/dashboard"
											? location.pathname === item.to
											: location.pathname.startsWith(item.to);
									return (
										<SidebarMenuItem key={item.to}>
											<SidebarMenuButton asChild isActive={active} tooltip={t(item.labelKey)}>
												<Link to={item.to}>
													<HugeiconsIcon icon={item.icon} className="size-4" />
													<span>{t(item.labelKey)}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className="border-t">
					<UserMenu />
				</SidebarFooter>
			</Sidebar>
		);
	},
	() => true,
);
AppSidebar.displayName = "AppSidebar";
