import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { reportError, setupGlobalErrorHandlers } from "#shared/lib/error-reporter";
import { routeTree } from "./routeTree.gen";
import "./index.css";
import "#shared/i18n/config";

// Set up global error handlers (window.onerror, unhandledrejection)
setupGlobalErrorHandlers();

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			reportError(error, `query: ${JSON.stringify(query.queryKey)}`);
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			reportError(
				error,
				`mutation: ${mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : "unknown"}`,
			);
			const metaMessage = mutation.meta?.errorMessage as string | undefined;
			const serverMessage = error instanceof Error ? error.message : "";
			// Prefer friendly meta message. Only show server text for validation-style errors
			// (short, human-readable, no URLs). Otherwise generic fallback.
			const looksLikeInternalDetail =
				/\//.test(serverMessage) ||
				serverMessage.length > 160 ||
				/Cannot\s+(GET|POST|PUT|PATCH|DELETE)/i.test(serverMessage);
			const message = looksLikeInternalDetail
				? (metaMessage ?? "Something went wrong")
				: (metaMessage ?? serverMessage ?? "Something went wrong");
			toast.error(message);
		},
		onSuccess: (_data, _variables, _context, mutation) => {
			const success = mutation.meta?.successMessage as string | undefined;
			if (success) toast.success(success);
		},
	}),
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("root element not found");

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
