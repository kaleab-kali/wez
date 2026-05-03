import { type FallbackProps, ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { reportError } from "#shared/lib/error-reporter";

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
	const { t } = useTranslation();
	return (
		<div className="flex min-h-screen items-center justify-center p-8">
			<div className="max-w-md space-y-4 text-center">
				<h1 className="text-2xl font-semibold text-destructive">{t("common.somethingWentWrong")}</h1>
				<p className="text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
				<button
					type="button"
					onClick={resetErrorBoundary}
					className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
				>
					{t("common.tryAgain")}
				</button>
			</div>
		</div>
	);
};
ErrorFallback.displayName = "ErrorFallback";

const handleError = (error: unknown, info: { componentStack?: string | null }) => {
	const err = error instanceof Error ? error : new Error(String(error));
	reportError(err, `componentStack: ${info.componentStack || "unknown"}`);
};

export const AppErrorBoundary = ({ children }: { children: React.ReactNode }) => (
	<ReactErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
		{children}
	</ReactErrorBoundary>
);
AppErrorBoundary.displayName = "AppErrorBoundary";
