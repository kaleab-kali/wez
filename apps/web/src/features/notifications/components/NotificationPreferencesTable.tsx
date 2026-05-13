import React from "react";
import { useTranslation } from "react-i18next";
import {
	type NotificationPreference,
	useNotificationPreferences,
	useUpdateNotificationPreference,
} from "#features/notifications/api/notification.queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CHANNELS = ["sms", "email", "in_app"] as const;
const CATEGORIES = [
	"auth",
	"hire_request",
	"placement",
	"complaint",
	"ticket",
	"referral",
	"training",
	"report",
	"general",
] as const;

type NotificationChannel = (typeof CHANNELS)[number];
type NotificationCategory = (typeof CATEGORIES)[number];

const preferenceKey = (category: string, channel: string) => `${category}:${channel}`;

const preferenceMap = (preferences: readonly NotificationPreference[]) =>
	new Map(preferences.map((preference) => [preferenceKey(preference.category, preference.channel), preference]));

export const NotificationPreferencesTable = React.memo(() => {
	const { t } = useTranslation();
	const { data, isLoading, isError } = useNotificationPreferences();
	const updatePreference = useUpdateNotificationPreference();
	const preferencesByKey = React.useMemo(() => preferenceMap(data ?? []), [data]);
	const [error, setError] = React.useState("");

	const onToggle = React.useCallback(
		(category: NotificationCategory, channel: NotificationChannel) => async (enabled: boolean) => {
			setError("");
			try {
				await updatePreference.mutateAsync({ category, channel, enabled });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("notifications.preferences.updateError"));
			}
		},
		[updatePreference, t],
	);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-96 max-w-full" />
				</CardHeader>
				<CardContent className="space-y-3">
					{CATEGORIES.slice(0, 5).map((category) => (
						<Skeleton key={category} className="h-10 w-full" />
					))}
				</CardContent>
			</Card>
		);
	}

	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("notifications.preferences.title")}</CardTitle>
					<CardDescription>{t("common.error")}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("notifications.preferences.title")}</CardTitle>
				<CardDescription>{t("notifications.preferences.subtitle")}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("notifications.preferences.category")}</TableHead>
							{CHANNELS.map((channel) => (
								<TableHead key={channel} className="text-center">
									{t(`notifications.channels.${channel}`)}
								</TableHead>
							))}
							<TableHead>{t("notifications.preferences.policy")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{CATEGORIES.map((category) => {
							const firstPreference = preferencesByKey.get(preferenceKey(category, CHANNELS[0]));
							const locked = firstPreference?.locked ?? false;
							return (
								<TableRow key={category}>
									<TableCell>
										<div className="font-medium">{t(`notifications.categories.${category}`)}</div>
									</TableCell>
									{CHANNELS.map((channel) => {
										const preference = preferencesByKey.get(preferenceKey(category, channel));
										const checked = preference?.enabled ?? true;
										return (
											<TableCell key={channel} className="text-center">
												<Switch
													size="sm"
													checked={checked}
													disabled={locked || updatePreference.isPending}
													aria-label={`${t(`notifications.categories.${category}`)} ${t(
														`notifications.channels.${channel}`,
													)}`}
													onCheckedChange={onToggle(category, channel)}
												/>
											</TableCell>
										);
									})}
									<TableCell>
										{locked ? (
											<Badge variant="secondary">{t("notifications.preferences.required")}</Badge>
										) : (
											<span className="text-sm text-muted-foreground">{t("notifications.preferences.optional")}</span>
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
});
NotificationPreferencesTable.displayName = "NotificationPreferencesTable";
