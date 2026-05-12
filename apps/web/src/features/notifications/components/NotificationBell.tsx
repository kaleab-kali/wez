import { BellDotIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type NotificationItem,
	notificationKeys,
	useMarkAllNotificationsRead,
	useMarkNotificationRead,
	useNotifications,
} from "#features/notifications/api/notification.queries";
import { connectNotificationSocket, disconnectNotificationSocket } from "#features/notifications/api/socket";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

type NotificationScope = "staff" | "customer";

type NotificationTarget =
	| { readonly type: "staffComplaint"; readonly complaintId: string }
	| { readonly type: "staffTicket"; readonly ticketId: string }
	| { readonly type: "staffComplaints" }
	| { readonly type: "staffTickets" }
	| { readonly type: "staffHireRequests" }
	| { readonly type: "staffReferrals" }
	| { readonly type: "staffPlacements" }
	| { readonly type: "customerRequests" }
	| { readonly type: "customerReferrals" }
	| { readonly type: "customerComplaints" }
	| { readonly type: "customerDashboard" };

const CUSTOMER_APP_PREFIX = "/app";
const COMPLAINT_ID_KEY = "complaintId";
const TICKET_ID_KEY = "ticketId";
const HIRE_REQUEST_ID_KEY = "hireRequestId";
const REFERRAL_ID_KEY = "referralId";
const PLACEMENT_ID_KEY = "placementId";

const payloadString = (payload: Record<string, unknown>, key: string): string | null => {
	const value = payload[key];
	return typeof value === "string" && value.length > 0 ? value : null;
};

const startsWithTemplate = (notification: NotificationItem, prefix: string): boolean =>
	notification.templateKey.startsWith(prefix);

const targetForNotification = (notification: NotificationItem, scope: NotificationScope): NotificationTarget | null => {
	const complaintId = payloadString(notification.payload, COMPLAINT_ID_KEY);
	const ticketId = payloadString(notification.payload, TICKET_ID_KEY);
	const hireRequestId = payloadString(notification.payload, HIRE_REQUEST_ID_KEY);
	const referralId = payloadString(notification.payload, REFERRAL_ID_KEY);
	const placementId = payloadString(notification.payload, PLACEMENT_ID_KEY);

	if (scope === "staff") {
		if (complaintId) return { type: "staffComplaint", complaintId };
		if (ticketId) return { type: "staffTicket", ticketId };
		if (hireRequestId || startsWithTemplate(notification, "hire_request.")) return { type: "staffHireRequests" };
		if (referralId || startsWithTemplate(notification, "referral.")) return { type: "staffReferrals" };
		if (placementId || startsWithTemplate(notification, "placement.")) return { type: "staffPlacements" };
		if (startsWithTemplate(notification, "complaint.")) return { type: "staffComplaints" };
		if (startsWithTemplate(notification, "ticket.")) return { type: "staffTickets" };
		return null;
	}

	if (complaintId || startsWithTemplate(notification, "complaint.")) return { type: "customerComplaints" };
	if (hireRequestId || startsWithTemplate(notification, "hire_request.")) return { type: "customerRequests" };
	if (referralId || startsWithTemplate(notification, "referral.")) return { type: "customerReferrals" };
	if (placementId || startsWithTemplate(notification, "placement.")) return { type: "customerDashboard" };
	return null;
};

export const NotificationBell = React.memo(() => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const { data, isLoading } = useNotifications();
	const markRead = useMarkNotificationRead();
	const markAllRead = useMarkAllNotificationsRead();
	const unread = data?.meta.unread ?? 0;
	const scope = React.useMemo<NotificationScope>(
		() => (location.pathname.startsWith(CUSTOMER_APP_PREFIX) ? "customer" : "staff"),
		[location.pathname],
	);

	React.useEffect(() => {
		const socket = connectNotificationSocket();
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
	}, [queryClient]);

	const onMarkAll = React.useCallback(() => {
		markAllRead.mutate();
	}, [markAllRead]);

	const navigateToTarget = React.useCallback(
		(target: NotificationTarget) => {
			if (target.type === "staffComplaint") {
				navigate({ to: "/staff/complaints/$complaintId", params: { complaintId: target.complaintId } });
				return;
			}
			if (target.type === "staffTicket") {
				navigate({ to: "/staff/tickets/$ticketId", params: { ticketId: target.ticketId } });
				return;
			}
			if (target.type === "staffComplaints") {
				navigate({ to: "/staff/complaints" });
				return;
			}
			if (target.type === "staffTickets") {
				navigate({ to: "/staff/tickets" });
				return;
			}
			if (target.type === "staffHireRequests") {
				navigate({ to: "/staff/hire-requests" });
				return;
			}
			if (target.type === "staffReferrals") {
				navigate({ to: "/staff/referrals" });
				return;
			}
			if (target.type === "staffPlacements") {
				navigate({ to: "/staff/placements" });
				return;
			}
			if (target.type === "customerRequests") {
				navigate({ to: "/app/requests" });
				return;
			}
			if (target.type === "customerReferrals") {
				navigate({ to: "/app/referrals" });
				return;
			}
			if (target.type === "customerComplaints") {
				navigate({ to: "/app/complaints" });
				return;
			}
			navigate({ to: "/app/dashboard" });
		},
		[navigate],
	);

	const onNotificationOpen = React.useCallback(
		(notification: NotificationItem) => {
			const target = targetForNotification(notification, scope);
			markRead.mutate(notification.id, {
				onSettled: () => {
					if (target) navigateToTarget(target);
				},
			});
		},
		[markRead, navigateToTarget, scope],
	);

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
						<NotificationListItem
							key={notification.id}
							notification={notification}
							fallbackLabel={t("notifications.item")}
							onOpen={onNotificationOpen}
						/>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
});
NotificationBell.displayName = "NotificationBell";

const NotificationListItem = React.memo(
	({
		notification,
		fallbackLabel,
		onOpen,
	}: {
		readonly notification: NotificationItem;
		readonly fallbackLabel: string;
		readonly onOpen: (notification: NotificationItem) => void;
	}) => {
		const createdLabel = React.useMemo(
			() => new Date(notification.createdAt).toLocaleDateString(),
			[notification.createdAt],
		);
		const onClick = React.useCallback(() => {
			onOpen(notification);
		}, [notification, onOpen]);

		return (
			<button
				type="button"
				className={`w-full rounded-md border p-3 text-left transition hover:bg-muted ${
					notification.readAt ? "bg-background" : "bg-primary/5"
				}`}
				onClick={onClick}
			>
				<div className="flex items-start justify-between gap-3">
					<p className="font-medium text-sm">{notification.subject ?? fallbackLabel}</p>
					<span className="shrink-0 text-[11px] text-muted-foreground">{createdLabel}</span>
				</div>
				<p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{notification.body}</p>
			</button>
		);
	},
);
NotificationListItem.displayName = "NotificationListItem";
