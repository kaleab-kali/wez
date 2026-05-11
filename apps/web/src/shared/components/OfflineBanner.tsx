import { WifiOff01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { useTranslation } from "react-i18next";

const getOnlineStatus = () => navigator.onLine;

export const OfflineBanner = React.memo(() => {
	const { t } = useTranslation();
	const [isOnline, setIsOnline] = React.useState(getOnlineStatus);

	React.useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
		};

		const handleOffline = () => {
			setIsOnline(false);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	if (isOnline) {
		return null;
	}

	return (
		<div className="sticky top-0 z-50 border-b bg-amber-50 px-4 py-2 text-amber-950 dark:bg-amber-950 dark:text-amber-50">
			<div className="mx-auto flex max-w-6xl items-center gap-2 text-sm" role="status">
				<HugeiconsIcon icon={WifiOff01Icon} className="size-4 shrink-0" />
				<span>{t("pwa.offlineBanner")}</span>
			</div>
		</div>
	);
});
OfflineBanner.displayName = "OfflineBanner";
