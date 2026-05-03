import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminSession } from "#shared/lib/admin-auth-client";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const { data: session } = useAdminSession();
	const role = (session?.user as { role?: string } | undefined)?.role ?? "support";
	const twoFactorEnabled = (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled ?? false;

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
				<h2 className="text-lg font-semibold mb-2">Two-factor authentication</h2>
				<p className="text-sm text-muted-foreground mb-3">
					Status: <span className="font-mono">{twoFactorEnabled ? "ENABLED" : "DISABLED"}</span>
				</p>
				<Link to="/admin/2fa" className="text-sm text-primary underline">
					{twoFactorEnabled ? "Manage" : "Enable 2FA"}
				</Link>
			</div>
			<div className="rounded-lg border p-6">
				<h2 className="text-lg font-semibold mb-2">Sessions</h2>
				<Link to="/admin/sessions" className="text-sm text-primary underline">
					View active sessions
				</Link>
			</div>
		</div>
	);
}
