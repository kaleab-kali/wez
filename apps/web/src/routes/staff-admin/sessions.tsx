import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAuthClient } from "#shared/lib/admin-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/staff-admin/sessions")({
	component: SessionsPage,
});

function SessionsPage() {
	const qc = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["admin-auth", "sessions"],
		queryFn: async () => {
			const res = await adminAuthClient.listSessions();
			if (res.error) throw new Error(res.error.message ?? "Could not load sessions");
			return res.data;
		},
	});

	const revoke = useMutation({
		mutationFn: async (token: string) => {
			const res = await adminAuthClient.revokeSession({ token });
			if (res.error) throw new Error(res.error.message ?? "Revoke failed");
			return res.data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-auth", "sessions"] }),
	});

	return (
		<div className="max-w-2xl space-y-4">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground underline">
					&larr; Back to console
				</Link>
				<h1 className="text-2xl font-bold mt-2">Active sessions</h1>
			</div>
			{isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
			{data?.map((s) => (
				<Card key={s.id}>
					<CardHeader>
						<CardTitle className="text-sm font-mono">{s.ipAddress ?? "unknown ip"}</CardTitle>
					</CardHeader>
					<CardContent className="text-xs text-muted-foreground space-y-1">
						<p>UA: {s.userAgent ?? "unknown"}</p>
						<p>Created: {new Date(s.createdAt).toLocaleString()}</p>
						<p>Expires: {new Date(s.expiresAt).toLocaleString()}</p>
						<Button
							variant="destructive"
							size="sm"
							className="mt-2"
							onClick={() => revoke.mutate(s.token)}
							disabled={revoke.isPending}
						>
							Revoke
						</Button>
					</CardContent>
				</Card>
			))}
			{data && data.length === 0 && <p className="text-sm text-muted-foreground">No active sessions.</p>}
		</div>
	);
}
