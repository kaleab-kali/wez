import {
	Book02Icon,
	Coins01Icon,
	ContactBookIcon,
	DashboardSquare01Icon,
	Logout01Icon,
	NoteEditIcon,
	SecurityIcon,
	StoreLocation02Icon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useLocation } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { WezLogo } from "#components/branding/WezLogo";
import { adminAuthApi, useAdminSession } from "#shared/lib/admin-auth-client";
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

const NAV_ITEMS = [
	{ labelKey: "admin.nav.overview", to: "/staff-admin", icon: DashboardSquare01Icon, exact: true },
	{ labelKey: "admin.nav.staffUsers", to: "/staff-admin/staff-users", icon: ContactBookIcon, exact: false },
	{ labelKey: "admin.nav.stations", to: "/staff-admin/stations", icon: StoreLocation02Icon, exact: false },
	{ labelKey: "admin.nav.locations", to: "/staff-admin/locations", icon: StoreLocation02Icon, exact: false },
	{ labelKey: "admin.nav.roleCatalog", to: "/staff-admin/role-catalog", icon: Coins01Icon, exact: false },
	{ labelKey: "admin.nav.hiringPolicy", to: "/staff-admin/hiring-policy", icon: NoteEditIcon, exact: false },
	{ labelKey: "admin.nav.lookups", to: "/staff-admin/lookups", icon: Book02Icon, exact: false },
	{ labelKey: "admin.nav.twoFactor", to: "/staff-admin/2fa", icon: SecurityIcon, exact: false },
	{ labelKey: "admin.nav.sessions", to: "/staff-admin/sessions", icon: UserMultipleIcon, exact: false },
] as const;

export const AdminSidebar = React.memo(
	() => {
		const { t } = useTranslation();
		const { data: session } = useAdminSession();
		const location = useLocation();
		const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

		const onSignOut = React.useCallback(async () => {
			await adminAuthApi.logout();
			window.location.href = "/staff-login";
		}, []);

		return (
			<Sidebar collapsible="icon" className="border-r">
				<SidebarHeader className="border-b">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" className="hover:bg-transparent">
								<div className="flex h-9 w-24 shrink-0 items-center text-primary group-data-[collapsible=icon]:w-8">
									<WezLogo className="h-8 w-24 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-8" />
								</div>
								<div className="flex flex-col gap-0 text-left leading-tight group-data-[collapsible=icon]:hidden">
									<span className="text-[11px] text-muted-foreground">{t("admin.platformAdmin")}</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>{t("admin.nav.administration")}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{NAV_ITEMS.map((item) => {
									const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
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
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
								<div className="flex aspect-square size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
									{(user?.name ?? "A").slice(0, 1).toUpperCase()}
								</div>
								<div className="flex flex-col gap-0 text-left min-w-0 leading-tight">
									<span className="text-sm truncate">{user?.name ?? t("common.admin")}</span>
									<span className="text-[11px] text-muted-foreground truncate">{user?.email ?? ""}</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton onClick={onSignOut} className="text-destructive">
								<HugeiconsIcon icon={Logout01Icon} className="size-4" />
								<span>{t("common.signOut")}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
		);
	},
	() => true,
);
AdminSidebar.displayName = "AdminSidebar";
