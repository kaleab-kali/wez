import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import React from "react";
import { authClient } from "#shared/lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
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

function AuthenticatedLayout() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	React.useEffect(() => {
		if (!isPending && !session) {
			navigate({ to: "/login" });
		}
	}, [isPending, session, navigate]);

	if (isPending || !session) {
		return <LoadingScreen />;
	}

	// Phase 1A: minimal layout. Phase 1B+ will add Wez sidebar with role-based nav.
	return (
		<div className="min-h-screen p-6">
			<Outlet />
		</div>
	);
}
