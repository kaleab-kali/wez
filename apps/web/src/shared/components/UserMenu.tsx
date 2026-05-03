import { Logout01Icon, Moon02Icon, Settings02Icon, Sun03Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "#shared/lib/auth-client";
import { useTheme } from "@/components/theme-provider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export const UserMenu = React.memo(
	() => {
		const { t } = useTranslation();
		const navigate = useNavigate();
		const { data: session } = authClient.useSession();
		const { theme, setTheme } = useTheme();

		const handleLogout = React.useCallback(async () => {
			await authClient.signOut();
			window.location.href = "/login";
		}, []);

		const handleToggleTheme = React.useCallback(() => {
			setTheme(theme === "dark" ? "light" : "dark");
		}, [theme, setTheme]);

		const handleSettings = React.useCallback(() => {
			navigate({ to: "/dashboard" });
		}, [navigate]);

		const userName = session?.user?.name || t("common.user");
		const userEmail = session?.user?.email || "";

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton size="lg" className="w-full">
						<div className="flex aspect-square size-8 items-center justify-center rounded-full bg-muted">
							<HugeiconsIcon icon={UserIcon} size={16} />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{userName}</span>
							<span className="truncate text-xs text-muted-foreground">{userEmail}</span>
						</div>
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56" align="start">
					<DropdownMenuLabel>{userName}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleSettings}>
						<HugeiconsIcon icon={Settings02Icon} size={16} className="mr-2" />
						{t("common.settings")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleToggleTheme}>
						<HugeiconsIcon icon={theme === "dark" ? Sun03Icon : Moon02Icon} size={16} className="mr-2" />
						{theme === "dark" ? t("common.lightMode") : t("common.darkMode")}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleLogout}>
						<HugeiconsIcon icon={Logout01Icon} size={16} className="mr-2" />
						{t("common.signOut")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
	() => true,
);
UserMenu.displayName = "UserMenu";
