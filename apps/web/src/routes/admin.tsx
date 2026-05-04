import { createFileRoute, Outlet } from "@tanstack/react-router";
import React from "react";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
				<h1 className="text-2xl font-bold text-destructive">Access denied</h1>
				<p className="text-muted-foreground">HQ admin authentication required.</p>
				<a href="/admin-login" className="text-primary underline">
					Go to admin login
				</a>
			</div>
		</div>
	),
	() => true,
);
AccessDenied.displayName = "AccessDenied";

const AdminBanner = React.memo(
	() => (
		<div className="border-b border-destructive/30 bg-destructive/5 px-6 py-2">
			<p className="text-xs font-medium text-destructive uppercase tracking-wider">
				Super admin mode — platform-level data
			</p>
		</div>
	),
	() => true,
);
AdminBanner.displayName = "AdminBanner";

function AdminLayout() {
	const { data: session, isPending, isError } = useAdminSession();

	if (isPending) return <AdminLoadingScreen />;
	if (isError || !session?.user) return <AccessDenied />;

	return (
		<SidebarProvider>
			<AdminSidebar />
			<SidebarInset className="min-w-0 overflow-x-hidden">
				<TopBar />
				<AdminBanner />
				<main className="flex-1 p-6 min-w-0">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
