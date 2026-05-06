import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { adminAuthClient, useAdminSession, useInvalidateAdminSession } from "#shared/lib/admin-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff-admin/2fa")({
	component: TwoFactorPage,
});

const EnableForm = React.memo(
	() => {
		const invalidate = useInvalidateAdminSession();
		const [password, setPassword] = React.useState("");
		const [secret, setSecret] = React.useState<{ totpURI: string; backupCodes: string[] } | null>(null);
		const [verifyCode, setVerifyCode] = React.useState("");
		const [error, setError] = React.useState("");
		const [busy, setBusy] = React.useState(false);

		const onEnable = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setBusy(true);
				try {
					const res = await adminAuthClient.twoFactor.enable({ password });
					if (res.error) throw new Error(res.error.message ?? "Could not enable 2FA");
					setSecret(res.data as { totpURI: string; backupCodes: string[] });
				} catch (err) {
					setError(err instanceof Error ? err.message : "Could not enable 2FA");
				} finally {
					setBusy(false);
				}
			},
			[password],
		);

		const onVerify = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setBusy(true);
				try {
					const res = await adminAuthClient.twoFactor.verifyTotp({ code: verifyCode });
					if (res.error) throw new Error(res.error.message ?? "Invalid code");
					await invalidate();
				} catch (err) {
					setError(err instanceof Error ? err.message : "Invalid code");
				} finally {
					setBusy(false);
				}
			},
			[verifyCode, invalidate],
		);

		if (secret) {
			return (
				<Card>
					<CardHeader>
						<CardTitle>Scan with your authenticator</CardTitle>
						<CardDescription>Use Google Authenticator, Authy, or 1Password.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded border p-3">
							<p className="text-xs text-muted-foreground">otpauth URI (paste into authenticator):</p>
							<code className="text-xs break-all">{secret.totpURI}</code>
						</div>
						<div className="rounded border bg-muted/30 p-3">
							<p className="text-xs text-muted-foreground mb-2">Backup codes — save somewhere safe:</p>
							<ol className="grid grid-cols-2 gap-1 text-xs font-mono">
								{secret.backupCodes.map((code) => (
									<li key={code}>{code}</li>
								))}
							</ol>
						</div>
						<form onSubmit={onVerify} className="space-y-3">
							{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
							<div className="space-y-2">
								<Label htmlFor="verify">Verification code</Label>
								<Input
									id="verify"
									inputMode="numeric"
									pattern="\d{6}"
									maxLength={6}
									value={verifyCode}
									onChange={(e) => setVerifyCode(e.target.value)}
									required
									autoFocus
								/>
							</div>
							<Button type="submit" disabled={busy}>
								{busy ? "Verifying..." : "Verify and finish"}
							</Button>
						</form>
					</CardContent>
				</Card>
			);
		}

		return (
			<Card>
				<CardHeader>
					<CardTitle>Enable two-factor authentication</CardTitle>
					<CardDescription>Confirm your password to generate a TOTP secret + backup codes.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onEnable} className="space-y-4">
						{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoFocus
							/>
						</div>
						<Button type="submit" disabled={busy}>
							{busy ? "Generating..." : "Generate secret"}
						</Button>
					</form>
				</CardContent>
			</Card>
		);
	},
	() => true,
);
EnableForm.displayName = "EnableForm";

function TwoFactorPage() {
	const { data: session } = useAdminSession();
	const enabled = (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled ?? false;

	return (
		<div className="max-w-xl space-y-4">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground underline">
					&larr; Back to console
				</Link>
				<h1 className="text-2xl font-bold mt-2">Two-factor authentication</h1>
				<p className="text-muted-foreground text-sm mt-1">
					HQ accounts require 2FA per modules.md 1.1.3.
				</p>
			</div>
			{enabled ? (
				<Card>
					<CardHeader>
						<CardTitle>2FA is enabled</CardTitle>
						<CardDescription>You'll be prompted for a TOTP code at next sign-in.</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<EnableForm />
			)}
		</div>
	);
}
