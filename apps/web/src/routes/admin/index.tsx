import { createFileRoute } from "@tanstack/react-router";
import { useAdminSession } from "#shared/lib/admin-auth-client";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const { data: session } = useAdminSession();
	const role = (session?.user as { role?: string } | undefined)?.role ?? "support";

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h1 className="text-3xl font-bold">HQ Console</h1>
				<p className="text-muted-foreground mt-2">Welcome, {session?.user?.name}</p>
			</div>
			<div className="rounded-lg border p-6 bg-muted/30">
				<p className="text-sm text-muted-foreground">HQ role</p>
				<p className="text-xl font-mono">{role}</p>
			</div>
			<div className="rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-2">Phase 1A — foundation in place</h2>
				<p className="text-sm text-muted-foreground">
					Wez schema rebased to single-tenant worker-placement domain. Phase 1C onwards builds HQ tabs:
					Stations, Users, Workers, Employers, Placements, Complaints, Tickets, Roles &amp; Commission,
					Reports, Audit, Moderation.
				</p>
			</div>
		</div>
	);
}
