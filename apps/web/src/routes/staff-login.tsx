import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { adminAuthApi } from "#shared/lib/admin-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff-login")({
	component: AdminLoginPage,
});

const AdminLoginForm = React.memo(
	() => {
		const [email, setEmail] = React.useState("");
		const [password, setPassword] = React.useState("");
		const [error, setError] = React.useState("");
		const [loading, setLoading] = React.useState(false);

		const handleSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setLoading(true);
				try {
					await adminAuthApi.login(email, password);
					window.location.href = "/staff/dashboard";
				} catch (err) {
					setError(err instanceof Error ? err.message : "Invalid credentials");
					setLoading(false);
				}
			},
			[email, password],
		);

		const handleEmailChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setEmail(e.target.value);
		}, []);

		const handlePasswordChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setPassword(e.target.value);
		}, []);

		return (
			<Card className="w-full max-w-sm">
				<CardHeader className="space-y-1">
					<div className="flex items-center justify-center mb-2">
						<div className="rounded-lg bg-primary/10 p-2">
							<div className="text-primary text-sm font-bold">WEZ STAFF</div>
						</div>
					</div>
					<CardTitle className="text-2xl font-bold text-center">Staff sign-in</CardTitle>
					<CardDescription className="text-center">Station agents, supervisors, and HQ staff</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="admin-email">Email</Label>
							<Input
								id="admin-email"
								type="email"
								placeholder="admin@wez.local"
								value={email}
								onChange={handleEmailChange}
								required
								autoComplete="email"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="admin-password">Password</Label>
							<Input
								id="admin-password"
								type="password"
								placeholder={"••••••••"}
								value={password}
								onChange={handlePasswordChange}
								required
								autoComplete="current-password"
							/>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Authenticating..." : "Sign in"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		);
	},
	() => true,
);
AdminLoginForm.displayName = "AdminLoginForm";

function AdminLoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4 bg-background">
			<AdminLoginForm />
		</div>
	);
}
