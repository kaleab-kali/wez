import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import React from "react";
import { adminAuthApi, useAdminSession } from "#shared/lib/admin-auth-client";
import { hasStaffRouteAccess } from "#shared/lib/staff-roles";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/staff")({
	beforeLoad: async ({ location }) => {
		const session = await adminAuthApi.me().catch(() => {
			throw redirect({ to: "/staff-login" });
		});
		const user = session?.user as { role?: string; roles?: string[] } | undefined;
		if (!hasStaffRouteAccess(location.pathname, user?.role, user?.roles)) {
			throw redirect({ to: "/staff/dashboard", replace: true });
		}
	},
	component: StaffLayout,
});

const LoadingScreen = React.memo(
	() => (
		<div className="flex min-h-screen items-center justify-center">
			<div className="space-y-4 w-64">
				<Skeleton className="h-8 w-48 mx-auto" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</div>
		</div>
	),
	() => true,
);
LoadingScreen.displayName = "LoadingScreen";

function StaffLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: session, isPending, isError } = useAdminSession();

	React.useEffect(() => {
		if (!isPending && (isError || !session?.user)) {
			navigate({ to: "/staff-login" });
		}
	}, [isPending, isError, session, navigate]);

	const user = session?.user as { role?: string; roles?: string[] } | undefined;
	const canAccessRoute = hasStaffRouteAccess(location.pathname, user?.role, user?.roles);

	React.useEffect(() => {
		if (!isPending && session?.user && !canAccessRoute) {
			navigate({ to: "/staff/dashboard", replace: true });
		}
	}, [isPending, session, canAccessRoute, navigate]);

	if (isPending || !session?.user) return <LoadingScreen />;
	if (!canAccessRoute) return <LoadingScreen />;

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-w-0 overflow-x-hidden">
				<TopBar notificationUserId={session.user.id} />
				<main className="flex-1 p-6 min-w-0">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
