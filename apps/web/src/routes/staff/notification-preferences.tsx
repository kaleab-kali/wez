import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { NotificationPreferencesTable } from "#features/notifications/components/NotificationPreferencesTable";

const StaffNotificationPreferencesPage = React.memo(() => {
	const { t } = useTranslation();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">{t("notifications.preferences.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("notifications.preferences.staffSubtitle")}</p>
			</div>
			<NotificationPreferencesTable />
		</div>
	);
});
StaffNotificationPreferencesPage.displayName = "StaffNotificationPreferencesPage";

export const Route = createFileRoute("/staff/notification-preferences")({
	component: StaffNotificationPreferencesPage,
});
