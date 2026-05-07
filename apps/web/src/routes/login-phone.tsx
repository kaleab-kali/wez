import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
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
		const { t } = useTranslation();
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
					setError(t("auth.invalidPhone"));
					return;
				}
				setBusy(true);
				try {
					const res = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
					if (res.error) throw new Error(res.error.message ?? t("common.error"));
					setStep("code");
				} catch (err) {
					setError(err instanceof Error ? err.message : t("common.error"));
				} finally {
					setBusy(false);
				}
			},
			[phone, t],
		);

		const onVerify = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setBusy(true);
				try {
					const res = await authClient.phoneNumber.verify({ phoneNumber: phone, code });
					if (res.error) throw new Error(res.error.message ?? t("auth.invalidCode"));
					window.location.href = "/app/requests";
				} catch (err) {
					setError(err instanceof Error ? err.message : t("auth.invalidCode"));
				} finally {
					setBusy(false);
				}
			},
			[phone, code, t],
		);

		return (
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>{t("auth.phoneSignIn")}</CardTitle>
					<CardDescription>
						{step === "phone" ? t("auth.phoneStepEnter") : t("auth.phoneStepCode", { phone })}
					</CardDescription>
				</CardHeader>
				{step === "phone" ? (
					<form onSubmit={onSendCode}>
						<CardContent className="space-y-4">
							{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
							<div className="space-y-2">
								<Label htmlFor="phone">{t("auth.phone")}</Label>
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
								{busy ? t("auth.sending") : t("auth.sendCode")}
							</Button>
							<Link to="/login" className="text-sm text-muted-foreground">
								{t("auth.signInEmail")}
							</Link>
						</CardFooter>
					</form>
				) : (
					<form onSubmit={onVerify}>
						<CardContent className="space-y-4">
							{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
							<div className="space-y-2">
								<Label htmlFor="code">{t("auth.code")}</Label>
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
								{busy ? t("auth.verifying") : t("auth.verify")}
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
								{t("auth.useDifferentNumber")}
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
