import { createFileRoute, Outlet } from "@tanstack/react-router";
import React from "react";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
});

const AdminLoadingScreen = React.memo(
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
AdminLoadingScreen.displayName = "AdminLoadingScreen";

const AccessDenied = React.memo(
	() => (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center space-y-4">
				<h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
				<p className="text-muted-foreground">HQ admin authentication required.</p>
				<a href="/admin-login" className="text-primary underline">
					Go to Admin Login
				</a>
			</div>
		</div>
	),
	() => true,
);
AccessDenied.displayName = "AccessDenied";

function AdminLayout() {
	const { data: session, isPending, isError } = useAdminSession();

	if (isPending) return <AdminLoadingScreen />;
	if (isError || !session?.user) return <AccessDenied />;

	// Phase 1A: minimal admin layout. Phase 1C+ adds Wez HQ sidebar (Stations, Users, Workers, Roles config, etc.).
	return (
		<div className="min-h-screen p-6">
			<div className="mb-6 border-b pb-4">
				<p className="text-xs font-medium text-destructive uppercase tracking-wider">HQ Admin Console</p>
			</div>
			<Outlet />
		</div>
	);
}
