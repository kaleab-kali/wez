import { BellDotIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	notificationKeys,
	useMarkAllNotificationsRead,
	useMarkNotificationRead,
	useNotifications,
} from "#features/notifications/api/notification.queries";
import { connectNotificationSocket, disconnectNotificationSocket } from "#features/notifications/api/socket";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

type NotificationBellProps = {
	readonly userId: string;
};

export const NotificationBell = React.memo(({ userId }: NotificationBellProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data, isLoading } = useNotifications();
	const markRead = useMarkNotificationRead();
	const markAllRead = useMarkAllNotificationsRead();
	const unread = data?.meta.unread ?? 0;

	React.useEffect(() => {
		const socket = connectNotificationSocket(userId);
		const onNotification = () => {
			void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
		};
		socket.on("notification", onNotification);
		socket.on("badge", onNotification);
		return () => {
			socket.off("notification", onNotification);
			socket.off("badge", onNotification);
			disconnectNotificationSocket();
		};
	}, [queryClient, userId]);

	const onMarkAll = React.useCallback(() => {
		markAllRead.mutate();
	}, [markAllRead]);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button type="button" variant="ghost" size="icon-sm" aria-label={t("notifications.title")} className="relative">
					<HugeiconsIcon icon={BellDotIcon} className="size-4" />
					{unread > 0 && (
						<span className="-right-0.5 -top-0.5 absolute min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground leading-4">
							{unread > 9 ? "9+" : unread}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 gap-3">
				<PopoverHeader className="flex-row items-center justify-between">
					<PopoverTitle>{t("notifications.title")}</PopoverTitle>
					<Button type="button" variant="ghost" size="sm" disabled={unread === 0} onClick={onMarkAll}>
						{t("notifications.markAllRead")}
					</Button>
				</PopoverHeader>
				<div className="max-h-96 space-y-2 overflow-y-auto">
					{isLoading && <p className="text-muted-foreground text-sm">{t("common.loading")}</p>}
					{!isLoading && data?.data.length === 0 && (
						<p className="text-muted-foreground text-sm">{t("notifications.empty")}</p>
					)}
					{data?.data.map((notification) => (
						<button
							key={notification.id}
							type="button"
							className={`w-full rounded-md border p-3 text-left transition hover:bg-muted ${
								notification.readAt ? "bg-background" : "bg-primary/5"
							}`}
							onClick={() => markRead.mutate(notification.id)}
						>
							<div className="flex items-start justify-between gap-3">
								<p className="font-medium text-sm">{notification.subject ?? t("notifications.item")}</p>
								<span className="shrink-0 text-[11px] text-muted-foreground">
									{new Date(notification.createdAt).toLocaleDateString()}
								</span>
							</div>
							<p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{notification.body}</p>
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
});
NotificationBell.displayName = "NotificationBell";
