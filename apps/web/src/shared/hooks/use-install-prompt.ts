import React from "react";

type InstallPromptOutcome = "accepted" | "dismissed" | "unavailable";

type BeforeInstallPromptChoice = {
	readonly outcome: "accepted" | "dismissed";
	readonly platform: string;
};

type BeforeInstallPromptEvent = Event & {
	readonly platforms: readonly string[];
	readonly userChoice: Promise<BeforeInstallPromptChoice>;
	prompt: () => Promise<void>;
};

type NavigatorWithStandalone = Navigator & {
	readonly standalone?: boolean;
};

const DISPLAY_MODE_STANDALONE_QUERY = "(display-mode: standalone)";
const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/i;
const MAC_INTEL_PLATFORM = "MacIntel";
const IPAD_TOUCH_POINTS_THRESHOLD = 1;

const getIsStandalone = () =>
	window.matchMedia(DISPLAY_MODE_STANDALONE_QUERY).matches ||
	(navigator as NavigatorWithStandalone).standalone === true;

const getIsIosDevice = () =>
	IOS_DEVICE_PATTERN.test(navigator.userAgent) ||
	(navigator.platform === MAC_INTEL_PLATFORM && navigator.maxTouchPoints > IPAD_TOUCH_POINTS_THRESHOLD);

export const useInstallPrompt = () => {
	const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
	const [isInstalled, setIsInstalled] = React.useState(getIsStandalone);

	React.useEffect(() => {
		const handleBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			setPromptEvent(event as BeforeInstallPromptEvent);
		};

		const handleAppInstalled = () => {
			setIsInstalled(true);
			setPromptEvent(null);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		window.addEventListener("appinstalled", handleAppInstalled);

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
			window.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	const promptInstall = React.useCallback(async (): Promise<InstallPromptOutcome> => {
		if (!promptEvent) {
			return "unavailable";
		}

		await promptEvent.prompt();
		const choice = await promptEvent.userChoice;
		setPromptEvent(null);
		return choice.outcome;
	}, [promptEvent]);

	const isIosInstallCandidate = React.useMemo(() => !isInstalled && getIsIosDevice(), [isInstalled]);

	return React.useMemo(
		() => ({
			canInstall: !isInstalled && promptEvent !== null,
			isInstalled,
			isIosInstallCandidate,
			promptInstall,
		}),
		[isInstalled, isIosInstallCandidate, promptEvent, promptInstall],
	);
};
