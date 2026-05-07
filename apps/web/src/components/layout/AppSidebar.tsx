import {
	Book02Icon,
	Briefcase02Icon,
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
import { hasHqAdminRole, STAFF_ROLES, type StaffRole } from "#shared/lib/staff-roles";
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
	roles?: readonly StaffRole[];
};

// Operations sidebar — visible to all staff. Order: most-used first.
const OPERATIONS: ReadonlyArray<NavItem> = [
	{ labelKey: "nav.dashboard", to: "/staff/dashboard", icon: DashboardSquare01Icon },
	{
		labelKey: "nav.workers",
		to: "/staff/workers",
		icon: UserMultipleIcon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	},
	{
		labelKey: "nav.employers",
		to: "/staff/employers",
		icon: ContactBookIcon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	},
	{
		labelKey: "nav.jobs",
		to: "/staff/jobs",
		icon: Briefcase02Icon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	},
	{
		labelKey: "nav.hireRequests",
		to: "/staff/hire-requests",
		icon: NoteEditIcon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	},
	{
		labelKey: "nav.referrals",
		to: "/staff/referrals",
		icon: ContactBookIcon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.stationSupervisor, STAFF_ROLES.agent],
	},
	{
		labelKey: "nav.placements",
		to: "/staff/placements",
		icon: Briefcase02Icon,
		roles: [
			STAFF_ROLES.superAdmin,
			STAFF_ROLES.opsManager,
			STAFF_ROLES.financeManager,
			STAFF_ROLES.stationSupervisor,
			STAFF_ROLES.agent,
		],
	},
];

// HQ admin sidebar — only visible to roles that manage platform-wide config.
const ADMINISTRATION: ReadonlyArray<NavItem> = [
	{
		labelKey: "admin.nav.overview",
		to: "/staff-admin",
		icon: DashboardSquare01Icon,
		roles: [
			STAFF_ROLES.superAdmin,
			STAFF_ROLES.opsManager,
			STAFF_ROLES.complianceOfficer,
			STAFF_ROLES.hrManager,
			STAFF_ROLES.financeManager,
			STAFF_ROLES.itManager,
			STAFF_ROLES.trainingManager,
			STAFF_ROLES.executiveViewer,
		],
	},
	{
		labelKey: "admin.nav.staffUsers",
		to: "/staff-admin/staff-users",
		icon: ContactBookIcon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager, STAFF_ROLES.hrManager],
	},
	{
		labelKey: "admin.nav.stations",
		to: "/staff-admin/stations",
		icon: StoreLocation02Icon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager],
	},
	{
		labelKey: "admin.nav.locations",
		to: "/staff-admin/locations",
		icon: StoreLocation02Icon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager],
	},
	{
		labelKey: "admin.nav.roleCatalog",
		to: "/staff-admin/role-catalog",
		icon: Coins01Icon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager],
	},
	{
		labelKey: "admin.nav.hiringPolicy",
		to: "/staff-admin/hiring-policy",
		icon: NoteEditIcon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager, STAFF_ROLES.itManager],
	},
	{
		labelKey: "admin.nav.lookups",
		to: "/staff-admin/lookups",
		icon: Book02Icon,
		roles: [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager],
	},
	{
		labelKey: "admin.nav.auditLog",
		to: "/staff-admin/audit-log",
		icon: SecurityIcon,
		roles: [
			STAFF_ROLES.superAdmin,
			STAFF_ROLES.opsManager,
			STAFF_ROLES.complianceOfficer,
			STAFF_ROLES.hrManager,
			STAFF_ROLES.financeManager,
			STAFF_ROLES.itManager,
			STAFF_ROLES.executiveViewer,
		],
	},
	{ labelKey: "admin.nav.twoFactor", to: "/staff-admin/2fa", icon: SecurityIcon },
];

const ACCOUNT: ReadonlyArray<NavItem> = [
	{ labelKey: "admin.nav.sessions", to: "/staff-admin/sessions", icon: UserMultipleIcon },
];

const hasAnyRole = (userRoles: readonly string[], allowedRoles: readonly StaffRole[] | undefined) =>
	!allowedRoles || allowedRoles.some((allowedRole) => userRoles.includes(allowedRole));

export const AppSidebar = React.memo(
	() => {
		const { t } = useTranslation();
		const { data: session } = useAdminSession();
		const user = session?.user as { name?: string; email?: string; role?: string; roles?: string[] } | undefined;
		const role = user?.role;
		const userRoles = React.useMemo(
			() => Array.from(new Set([role, ...(user?.roles ?? [])].filter((item): item is string => Boolean(item)))),
			[role, user?.roles],
		);
		const showHQ = hasHqAdminRole(userRoles, role);
		const location = useLocation();

		const onSignOut = React.useCallback(async () => {
			await adminAuthApi.logout();
			window.location.href = "/staff-login";
		}, []);

		const renderItems = (items: ReadonlyArray<NavItem>) =>
			items
				.filter((item) => hasAnyRole(userRoles, item.roles))
				.map((item) => {
					const active =
						location.pathname === item.to || (item.to !== "/staff/dashboard" && location.pathname.startsWith(item.to));
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

					{showHQ && (
						<SidebarGroup>
							<SidebarGroupLabel>{t("admin.nav.account")}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>{renderItems(ACCOUNT)}</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}
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
