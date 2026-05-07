import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { hasHqAdminRole, hasStaffRouteAccess } from "#shared/lib/staff-roles";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/staff-admin")({
	component: StaffAdminLayout,
});

const LoadingScreen = React.memo(
	() => (
		<div className="flex min-h-screen items-center justify-center">
			<div className="space-y-4 w-64">
				<Skeleton className="h-8 w-48 mx-auto" />
				<Skeleton className="h-4 w-full" />
			</div>
		</div>
	),
	() => true,
);
LoadingScreen.displayName = "LoadingScreen";

function StaffAdminLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const { data: session, isPending, isError } = useAdminSession();

	React.useEffect(() => {
		if (!isPending && (isError || !session?.user)) {
			navigate({ to: "/staff-login" });
		}
	}, [isPending, isError, session, navigate]);

	const user = session?.user as { role?: string; roles?: string[] } | undefined;
	const canAccessAdmin = hasHqAdminRole(user?.roles, user?.role);
	const canAccessRoute = hasStaffRouteAccess(location.pathname, user?.role, user?.roles);

	React.useEffect(() => {
		if (!isPending && session?.user && (!canAccessAdmin || !canAccessRoute)) {
			navigate({ to: "/staff/dashboard", replace: true });
		}
	}, [isPending, session, canAccessAdmin, canAccessRoute, navigate]);

	if (isPending || !session?.user) return <LoadingScreen />;
	if (!canAccessAdmin || !canAccessRoute) return <LoadingScreen />;

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-w-0 overflow-x-hidden">
				<TopBar />
				<main className="flex-1 p-6 min-w-0">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
