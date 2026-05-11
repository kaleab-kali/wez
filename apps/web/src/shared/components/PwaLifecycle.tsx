import { useRegisterSW } from "virtual:pwa-register/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { reportError } from "#shared/lib/error-reporter";

const OFFLINE_READY_TOAST_ID = "pwa-offline-ready";
const UPDATE_READY_TOAST_ID = "pwa-update-ready";

export const PwaLifecycle = React.memo(() => {
	const { t } = useTranslation();
	const {
		offlineReady: [offlineReady, setOfflineReady],
		needRefresh: [needRefresh, setNeedRefresh],
		updateServiceWorker,
	} = useRegisterSW({
		onRegisterError(error) {
			reportError(error, "pwa service worker registration");
		},
	});

	const closeLifecycleToasts = React.useCallback(() => {
		setOfflineReady(false);
		setNeedRefresh(false);
		toast.dismiss(OFFLINE_READY_TOAST_ID);
		toast.dismiss(UPDATE_READY_TOAST_ID);
	}, [setOfflineReady, setNeedRefresh]);

	const updateNow = React.useCallback(() => {
		void updateServiceWorker(true);
	}, [updateServiceWorker]);

	React.useEffect(() => {
		if (!offlineReady) {
			return;
		}

		toast.success(t("pwa.offlineReady"), {
			id: OFFLINE_READY_TOAST_ID,
			duration: 5000,
			action: {
				label: t("common.done"),
				onClick: closeLifecycleToasts,
			},
		});
	}, [offlineReady, t, closeLifecycleToasts]);

	React.useEffect(() => {
		if (!needRefresh) {
			return;
		}

		toast.message(t("pwa.updateReady"), {
			id: UPDATE_READY_TOAST_ID,
			duration: Number.POSITIVE_INFINITY,
			action: {
				label: t("pwa.updateAction"),
				onClick: updateNow,
			},
			cancel: {
				label: t("common.cancel"),
				onClick: closeLifecycleToasts,
			},
		});
	}, [needRefresh, t, updateNow, closeLifecycleToasts]);

	return null;
});
PwaLifecycle.displayName = "PwaLifecycle";
