import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppErrorBoundary } from "#shared/components/ErrorBoundary";
import { OfflineBanner } from "#shared/components/OfflineBanner";
import { PwaInstallPrompt } from "#shared/components/PwaInstallPrompt";
import { PwaLifecycle } from "#shared/components/PwaLifecycle";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	return (
		<ThemeProvider defaultTheme="system" storageKey="wez-theme">
			<TooltipProvider>
				<AppErrorBoundary>
					<OfflineBanner />
					<div className="min-h-screen bg-background">
						<Outlet />
					</div>
					<PwaLifecycle />
					<PwaInstallPrompt />
					<Toaster position="top-right" richColors closeButton />
				</AppErrorBoundary>
			</TooltipProvider>
		</ThemeProvider>
	);
}
