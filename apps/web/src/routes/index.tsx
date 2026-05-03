import { createFileRoute, Navigate } from "@tanstack/react-router";
import { authClient } from "#shared/lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
	component: RootIndex,
});

function RootIndex() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Skeleton className="h-8 w-48" />
			</div>
		);
	}

	if (!session) {
		return <Navigate to="/login" />;
	}

	return <Navigate to="/dashboard" />;
}
