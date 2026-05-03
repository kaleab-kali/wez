const MAX_REPORTS_PER_MINUTE = 10;
const DEBOUNCE_MS = 2000;
const ENDPOINT = "/api/v1/error-reports";

let reportCount = 0;
let resetTimer: ReturnType<typeof setTimeout> | null = null;
let pendingErrors: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const resetRateLimit = () => {
	reportCount = 0;
	resetTimer = null;
};

const flush = async () => {
	if (pendingErrors.length === 0) return;
	const batch = [...pendingErrors];
	pendingErrors = [];

	for (const error of batch) {
		if (reportCount >= MAX_REPORTS_PER_MINUTE) break;
		reportCount++;

		if (!resetTimer) {
			resetTimer = setTimeout(resetRateLimit, 60_000);
		}

		try {
			await fetch(ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(error),
			});
		} catch {
			// Silent failure — error reporting must never break the app
		}
	}
};

export const reportError = (error: unknown, context?: string) => {
	const errorPayload = {
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
		url: globalThis.location?.href,
		userAgent: globalThis.navigator?.userAgent,
		timestamp: new Date().toISOString(),
		context,
	};

	pendingErrors.push(errorPayload);

	if (flushTimer) clearTimeout(flushTimer);
	flushTimer = setTimeout(flush, DEBOUNCE_MS);
};

export const setupGlobalErrorHandlers = () => {
	globalThis.addEventListener("error", (event) => {
		reportError(event.error || event.message, "window.onerror");
	});

	globalThis.addEventListener("unhandledrejection", (event) => {
		reportError(event.reason, "unhandledrejection");
	});
};
