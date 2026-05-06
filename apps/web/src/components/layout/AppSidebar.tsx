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

type NavItem = {
	labelKey: string;
	to: string;
	icon: typeof DashboardSquare01Icon;
};

// Operations sidebar — visible to all staff. Order: most-used first.
const OPERATIONS: ReadonlyArray<NavItem> = [
	{ labelKey: "nav.dashboard", to: "/staff/dashboard", icon: DashboardSquare01Icon },
	{ labelKey: "nav.workers", to: "/staff/workers", icon: UserMultipleIcon },
	{ labelKey: "nav.employers", to: "/staff/employers", icon: ContactBookIcon },
	{ labelKey: "nav.hireRequests", to: "/staff/hire-requests", icon: NoteEditIcon },
];

// HQ admin sidebar — only visible to roles that manage platform-wide config.
const HQ_ROLES = new Set([
	"super_admin",
	"ops_manager",
	"compliance_officer",
	"hr_manager",
	"finance_manager",
	"it_manager",
	"training_manager",
]);

const ADMINISTRATION: ReadonlyArray<NavItem> = [
	{ labelKey: "admin.nav.stations", to: "/staff-admin/stations", icon: StoreLocation02Icon },
	{ labelKey: "admin.nav.roleCatalog", to: "/staff-admin/role-catalog", icon: Coins01Icon },
	{ labelKey: "admin.nav.lookups", to: "/staff-admin/lookups", icon: Book02Icon },
];

const ACCOUNT: ReadonlyArray<NavItem> = [
	{ labelKey: "admin.nav.twoFactor", to: "/staff-admin/2fa", icon: SecurityIcon },
	{ labelKey: "admin.nav.sessions", to: "/staff-admin/sessions", icon: UserMultipleIcon },
];

export const AppSidebar = React.memo(
	() => {
		const { t } = useTranslation();
		const { data: session } = useAdminSession();
		const user = session?.user as { name?: string; email?: string; role?: string } | undefined;
		const role = user?.role;
		const showHQ = !!role && HQ_ROLES.has(role);
		const location = useLocation();

		const onSignOut = React.useCallback(async () => {
			await adminAuthApi.logout();
			window.location.href = "/staff-login";
		}, []);

		const renderItems = (items: ReadonlyArray<NavItem>) =>
			items.map((item) => {
				const active = location.pathname === item.to || (item.to !== "/staff/dashboard" && location.pathname.startsWith(item.to));
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
			});

		return (
			<Sidebar collapsible="icon" className="border-r">
				<SidebarHeader className="border-b">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default">
								<div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/10 text-primary p-1.5">
									<WezLogo variant="mark" className="size-full" />
								</div>
								<div className="flex flex-col gap-0 text-left leading-tight">
									<span className="font-bold text-base tracking-tight">Wez</span>
									<span className="text-[11px] text-muted-foreground">
										{showHQ ? t("admin.platformAdmin") : t("brand.tagline")}
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
							<SidebarMenu>{renderItems(OPERATIONS)}</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>

					{showHQ && (
						<SidebarGroup>
							<SidebarGroupLabel>{t("admin.nav.administration")}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>{renderItems(ADMINISTRATION)}</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}

					<SidebarGroup>
						<SidebarGroupLabel>{t("admin.platformAdmin")}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>{renderItems(ACCOUNT)}</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className="border-t">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
								<div className="flex aspect-square size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
									{(user?.name ?? "?").slice(0, 1).toUpperCase()}
								</div>
								<div className="flex flex-col gap-0 text-left min-w-0 leading-tight">
									<span className="text-sm truncate">{user?.name ?? ""}</span>
									<span className="text-[11px] text-muted-foreground truncate font-mono">{role ?? ""}</span>
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton onClick={onSignOut}>
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
AppSidebar.displayName = "AppSidebar";
