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
import {
	effectiveStaffRoles,
	hasAnyStaffRole,
	hasHqAdminRole,
	STAFF_ACCESS_ROLES,
	type StaffRole,
} from "#shared/lib/staff-roles";
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
		roles: STAFF_ACCESS_ROLES.workerEmployerOperations,
	},
	{
		labelKey: "nav.employers",
		to: "/staff/employers",
		icon: ContactBookIcon,
		roles: STAFF_ACCESS_ROLES.workerEmployerOperations,
	},
	{
		labelKey: "nav.jobs",
		to: "/staff/jobs",
		icon: Briefcase02Icon,
		roles: STAFF_ACCESS_ROLES.demandOperations,
	},
	{
		labelKey: "nav.hireRequests",
		to: "/staff/hire-requests",
		icon: NoteEditIcon,
		roles: STAFF_ACCESS_ROLES.demandOperations,
	},
	{
		labelKey: "nav.referrals",
		to: "/staff/referrals",
		icon: ContactBookIcon,
		roles: STAFF_ACCESS_ROLES.demandOperations,
	},
	{
		labelKey: "nav.placements",
		to: "/staff/placements",
		icon: Briefcase02Icon,
		roles: STAFF_ACCESS_ROLES.placementOperations,
	},
	{
		labelKey: "nav.complaints",
		to: "/staff/complaints",
		icon: SecurityIcon,
		roles: STAFF_ACCESS_ROLES.complaintOperations,
	},
	{
		labelKey: "nav.tickets",
		to: "/staff/tickets",
		icon: NoteEditIcon,
		roles: STAFF_ACCESS_ROLES.ticketOperations,
	},
];

// HQ admin sidebar — only visible to roles that manage platform-wide config.
const ADMINISTRATION: ReadonlyArray<NavItem> = [
	{
		labelKey: "admin.nav.overview",
		to: "/staff-admin",
		icon: DashboardSquare01Icon,
		roles: STAFF_ACCESS_ROLES.hqOverview,
	},
	{
		labelKey: "admin.nav.staffUsers",
		to: "/staff-admin/staff-users",
		icon: ContactBookIcon,
		roles: STAFF_ACCESS_ROLES.staffUsers,
	},
	{
		labelKey: "admin.nav.accessReview",
		to: "/staff-admin/access-review",
		icon: SecurityIcon,
		roles: STAFF_ACCESS_ROLES.accessReview,
	},
	{
		labelKey: "admin.nav.stations",
		to: "/staff-admin/stations",
		icon: StoreLocation02Icon,
		roles: STAFF_ACCESS_ROLES.platformConfig,
	},
	{
		labelKey: "admin.nav.locations",
		to: "/staff-admin/locations",
		icon: StoreLocation02Icon,
		roles: STAFF_ACCESS_ROLES.platformConfig,
	},
	{
		labelKey: "admin.nav.roleCatalog",
		to: "/staff-admin/role-catalog",
		icon: Coins01Icon,
		roles: STAFF_ACCESS_ROLES.platformConfig,
	},
	{
		labelKey: "admin.nav.hiringPolicy",
		to: "/staff-admin/hiring-policy",
		icon: NoteEditIcon,
		roles: STAFF_ACCESS_ROLES.hiringPolicy,
	},
	{
		labelKey: "admin.nav.lookups",
		to: "/staff-admin/lookups",
		icon: Book02Icon,
		roles: STAFF_ACCESS_ROLES.platformConfig,
	},
	{
		labelKey: "admin.nav.auditLog",
		to: "/staff-admin/audit-log",
		icon: SecurityIcon,
		roles: STAFF_ACCESS_ROLES.auditLog,
	},
];

const ACCOUNT: ReadonlyArray<NavItem> = [
	{
		labelKey: "admin.nav.twoFactor",
		to: "/staff-admin/2fa",
		icon: SecurityIcon,
		roles: STAFF_ACCESS_ROLES.accountSecurity,
	},
	{
		labelKey: "admin.nav.sessions",
		to: "/staff-admin/sessions",
		icon: UserMultipleIcon,
		roles: STAFF_ACCESS_ROLES.accountSecurity,
	},
];

export const AppSidebar = React.memo(
	() => {
		const { t } = useTranslation();
		const { data: session } = useAdminSession();
		const user = session?.user as { name?: string; email?: string; role?: string; roles?: string[] } | undefined;
		const role = user?.role;
		const userRoles = React.useMemo(() => effectiveStaffRoles(role, user?.roles), [role, user?.roles]);
		const showHQ = hasHqAdminRole(userRoles, role);
		const location = useLocation();
		const operationItems = React.useMemo(
			() => OPERATIONS.filter((item) => hasAnyStaffRole(userRoles, item.roles)),
			[userRoles],
		);
		const administrationItems = React.useMemo(
			() => ADMINISTRATION.filter((item) => hasAnyStaffRole(userRoles, item.roles)),
			[userRoles],
		);
		const accountItems = React.useMemo(
			() => ACCOUNT.filter((item) => hasAnyStaffRole(userRoles, item.roles)),
			[userRoles],
		);
		const showAdministration = showHQ && administrationItems.length > 0;

		const onSignOut = React.useCallback(async () => {
			await adminAuthApi.logout();
			window.location.href = "/staff-login";
		}, []);

		const renderItems = (items: ReadonlyArray<NavItem>) =>
			items.map((item) => {
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
										{showAdministration ? t("admin.platformAdmin") : t("brand.tagline")}
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
							<SidebarMenu>{renderItems(operationItems)}</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>

					{showAdministration && (
						<SidebarGroup>
							<SidebarGroupLabel>{t("admin.nav.administration")}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>{renderItems(administrationItems)}</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}

					{accountItems.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>{t("admin.nav.account")}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>{renderItems(accountItems)}</SidebarMenu>
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
