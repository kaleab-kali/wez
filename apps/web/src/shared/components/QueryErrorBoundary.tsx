import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { reportError } from "#shared/lib/error-reporter";

const QueryErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
	const { t } = useTranslation();
	return (
		<div className="flex items-center justify-center p-8">
			<div className="max-w-md space-y-4 text-center">
				<h2 className="text-lg font-semibold text-destructive">{t("common.failedToLoadData")}</h2>
				<p className="text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
				<button
					type="button"
					onClick={resetErrorBoundary}
					className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
				>
					{t("common.retry")}
				</button>
			</div>
		</div>
	);
};
QueryErrorFallback.displayName = "QueryErrorFallback";

export const QueryErrorBoundary = ({ children }: { children: React.ReactNode }) => (
	<QueryErrorResetBoundary>
		{({ reset }) => (
			<ErrorBoundary
				onReset={reset}
				FallbackComponent={QueryErrorFallback}
				onError={(error, info) => {
					const err = error instanceof Error ? error : new Error(String(error));
					reportError(err, `query-boundary: ${info.componentStack || "unknown"}`);
				}}
			>
				{children}
			</ErrorBoundary>
		)}
	</QueryErrorResetBoundary>
);
QueryErrorBoundary.displayName = "QueryErrorBoundary";
