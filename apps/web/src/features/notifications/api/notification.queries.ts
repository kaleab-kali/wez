import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type NotificationItem = {
	readonly id: string;
	readonly category: string;
	readonly templateKey: string;
	readonly payload: Record<string, unknown>;
	readonly subject: string | null;
	readonly body: string | null;
	readonly status: string;
	readonly readAt: string | null;
	readonly createdAt: string;
};

export type NotificationPreference = {
	readonly category: string;
	readonly channel: "sms" | "email" | "in_app";
	readonly enabled: boolean;
	readonly locked: boolean;
};

const BASE = "/notifications";

export const notificationKeys = {
	all: ["notifications"] as const,
	list: () => [...notificationKeys.all, "list"] as const,
	preferences: () => [...notificationKeys.all, "preferences"] as const,
	unread: () => [...notificationKeys.all, "unread"] as const,
};

export const useNotifications = () =>
	useQuery({
		queryKey: notificationKeys.list(),
		queryFn: () =>
			api
				.get<{ data: NotificationItem[]; meta: { unread: number } }>(BASE, { params: { limit: 10 } })
				.then((body) => body),
		refetchInterval: 60_000,
	});

export const useNotificationPreferences = () =>
	useQuery({
		queryKey: notificationKeys.preferences(),
		queryFn: () => api.get<{ data: NotificationPreference[] }>(`${BASE}/preferences`).then((body) => body.data),
	});

export const useMarkNotificationRead = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.post<{ data: NotificationItem }>(`${BASE}/${id}/read`).then((body) => body.data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
		},
	});
};

export const useMarkAllNotificationsRead = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.post<{ data: { updated: number } }>(`${BASE}/read-all`).then((body) => body.data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
		},
	});
};

export const useUpdateNotificationPreference = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { readonly category: string; readonly channel: string; readonly enabled: boolean }) =>
			api.patch<{ data: NotificationPreference }>(`${BASE}/preferences`, input).then((body) => body.data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
		},
	});
};
