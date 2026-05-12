import React from "react";
import { NotificationBell } from "#features/notifications/components/NotificationBell";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const TopBar = React.memo(
	({ title, notificationUserId }: { readonly title?: string; readonly notificationUserId?: string }) => (
		<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-2 h-4" />
			{title && <h1 className="text-sm font-semibold">{title}</h1>}
			<div className="flex-1" />
			{notificationUserId && <NotificationBell />}
			<LanguageSwitcher />
		</header>
	),
	(p, n) => p.title === n.title && p.notificationUserId === n.notificationUserId,
);
TopBar.displayName = "TopBar";
