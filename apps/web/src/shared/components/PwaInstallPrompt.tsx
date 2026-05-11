import { Download04Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useInstallPrompt } from "#shared/hooks/use-install-prompt";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

const INSTALL_DISMISSED_KEY = "wez.pwa.install.dismissed";
const INSTALL_ACCEPTED_OUTCOME = "accepted";

const getInitialDismissedState = () => sessionStorage.getItem(INSTALL_DISMISSED_KEY) === "true";
const getOnlineStatus = () => navigator.onLine;

export const PwaInstallPrompt = React.memo(() => {
	const { t } = useTranslation();
	const { canInstall, isInstalled, isIosInstallCandidate, promptInstall } = useInstallPrompt();
	const [isDismissed, setIsDismissed] = React.useState(getInitialDismissedState);
	const [isIosGuideOpen, setIsIosGuideOpen] = React.useState(false);
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

	const onDismiss = React.useCallback(() => {
		sessionStorage.setItem(INSTALL_DISMISSED_KEY, "true");
		setIsDismissed(true);
	}, []);

	const onInstall = React.useCallback(async () => {
		const outcome = await promptInstall();
		if (outcome === INSTALL_ACCEPTED_OUTCOME) {
			onDismiss();
		}
	}, [promptInstall, onDismiss]);

	const onOpenIosGuide = React.useCallback(() => {
		setIsIosGuideOpen(true);
	}, []);

	const onGuideOpenChange = React.useCallback((open: boolean) => {
		setIsIosGuideOpen(open);
	}, []);

	if (!isOnline || isInstalled || isDismissed || (!canInstall && !isIosInstallCandidate)) {
		return null;
	}

	return (
		<>
			<div className="fixed inset-x-4 bottom-4 z-40 rounded-4xl border bg-popover p-3 text-popover-foreground shadow-xl ring-1 ring-foreground/5 sm:right-4 sm:left-auto sm:w-[360px]">
				<div className="flex items-start gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary">
						<HugeiconsIcon icon={isIosInstallCandidate ? SmartPhone01Icon : Download04Icon} className="size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-semibold">{t("pwa.installTitle")}</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">{t("pwa.installBody")}</p>
						<div className="mt-3 flex flex-wrap gap-2">
							<Button size="sm" onClick={canInstall ? onInstall : onOpenIosGuide}>
								{canInstall ? t("pwa.installAction") : t("pwa.iosGuideAction")}
							</Button>
							<Button size="sm" variant="ghost" onClick={onDismiss}>
								{t("pwa.dismissAction")}
							</Button>
						</div>
					</div>
				</div>
			</div>
			<Dialog open={isIosGuideOpen} onOpenChange={onGuideOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("pwa.iosGuideTitle")}</DialogTitle>
						<DialogDescription>{t("pwa.iosGuideBody")}</DialogDescription>
					</DialogHeader>
					<ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
						<li>{t("pwa.iosStepShare")}</li>
						<li>{t("pwa.iosStepAdd")}</li>
						<li>{t("pwa.iosStepConfirm")}</li>
					</ol>
					<DialogFooter>
						<Button type="button" onClick={onDismiss}>
							{t("common.done")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
});
PwaInstallPrompt.displayName = "PwaInstallPrompt";
