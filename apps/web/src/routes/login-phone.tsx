import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login-phone")({
	component: PhoneLoginPage,
});

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;

const PhoneLoginForm = React.memo(
	() => {
		const [step, setStep] = React.useState<"phone" | "code">("phone");
		const [phone, setPhone] = React.useState("+2519");
		const [code, setCode] = React.useState("");
		const [error, setError] = React.useState("");
		const [busy, setBusy] = React.useState(false);

		const onSendCode = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				if (!ETHIOPIAN_PHONE.test(phone)) {
					setError("Phone must look like +2519XXXXXXXX");
					return;
				}
				setBusy(true);
				try {
					const res = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
					if (res.error) throw new Error(res.error.message ?? "Could not send code");
					setStep("code");
				} catch (err) {
					setError(err instanceof Error ? err.message : "Could not send code");
				} finally {
					setBusy(false);
				}
			},
			[phone],
		);

		const onVerify = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setBusy(true);
				try {
					const res = await authClient.phoneNumber.verify({ phoneNumber: phone, code });
					if (res.error) throw new Error(res.error.message ?? "Wrong code");
					window.location.href = "/dashboard";
				} catch (err) {
					setError(err instanceof Error ? err.message : "Wrong code");
				} finally {
					setBusy(false);
				}
			},
			[phone, code],
		);

		return (
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Worker sign-in</CardTitle>
					<CardDescription>
						{step === "phone" ? "Enter your phone number to receive a 6-digit code." : `Enter code sent to ${phone}.`}
					</CardDescription>
				</CardHeader>
				{step === "phone" ? (
					<form onSubmit={onSendCode}>
						<CardContent className="space-y-4">
							{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
							<div className="space-y-2">
								<Label htmlFor="phone">Phone</Label>
								<Input
									id="phone"
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="+2519XXXXXXXX"
									autoComplete="tel"
									autoFocus
									required
								/>
							</div>
						</CardContent>
						<CardFooter className="flex flex-col gap-3">
							<Button type="submit" className="w-full" disabled={busy}>
								{busy ? "Sending..." : "Send code"}
							</Button>
							<Link to="/login" className="text-sm text-muted-foreground">
								Sign in with email instead
							</Link>
						</CardFooter>
					</form>
				) : (
					<form onSubmit={onVerify}>
						<CardContent className="space-y-4">
							{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
							<div className="space-y-2">
								<Label htmlFor="code">Code</Label>
								<Input
									id="code"
									inputMode="numeric"
									pattern="\d{6}"
									maxLength={6}
									value={code}
									onChange={(e) => setCode(e.target.value)}
									placeholder="123456"
									autoFocus
									required
								/>
							</div>
						</CardContent>
						<CardFooter className="flex flex-col gap-3">
							<Button type="submit" className="w-full" disabled={busy}>
								{busy ? "Verifying..." : "Verify"}
							</Button>
							<button
								type="button"
								onClick={() => {
									setStep("phone");
									setCode("");
									setError("");
								}}
								className="text-sm text-muted-foreground"
							>
								Use a different number
							</button>
						</CardFooter>
					</form>
				)}
			</Card>
		);
	},
	() => true,
);
PhoneLoginForm.displayName = "PhoneLoginForm";

function PhoneLoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<PhoneLoginForm />
		</div>
	);
}
