import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import React from "react";
import { authClient } from "#shared/lib/auth-client";
import { getNavForRole } from "#shared/lib/role-nav";
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

const Sidebar = React.memo(
	({ role, name }: { readonly role: string; readonly name: string }) => {
		const items = getNavForRole(role);
		const onSignOut = React.useCallback(async () => {
			await authClient.signOut();
			window.location.href = "/login";
		}, []);
		return (
			<aside className="w-64 border-r bg-muted/20 p-6 flex flex-col gap-2 min-h-screen">
				<div className="mb-4">
					<p className="text-xs uppercase tracking-wider text-muted-foreground">Wez</p>
					<p className="text-sm font-mono">{role}</p>
				</div>
				<nav className="flex-1 space-y-1">
					{items.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="block rounded-md px-3 py-2 text-sm hover:bg-muted [&.active]:bg-muted [&.active]:font-semibold"
							activeOptions={{ exact: item.exact }}
						>
							{item.label}
						</Link>
					))}
				</nav>
				<div className="border-t pt-4 mt-4 space-y-1">
					<p className="text-xs text-muted-foreground truncate">{name}</p>
					<button
						type="button"
						onClick={onSignOut}
						className="text-sm text-destructive hover:underline"
					>
						Sign out
					</button>
				</div>
			</aside>
		);
	},
);
Sidebar.displayName = "Sidebar";

function AuthenticatedLayout() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	React.useEffect(() => {
		if (!isPending && !session) {
			navigate({ to: "/login" });
		}
	}, [isPending, session, navigate]);

	if (isPending || !session) return <LoadingScreen />;

	const user = session.user as { name?: string; role?: string };
	const role = user.role ?? "worker";
	const name = user.name ?? "User";

	return (
		<div className="min-h-screen flex">
			<Sidebar role={role} name={name} />
			<main className="flex-1 p-6 overflow-x-auto">
				<Outlet />
			</main>
		</div>
	);
}
