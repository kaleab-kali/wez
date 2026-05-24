import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { WezLogo } from "#components/branding/WezLogo";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const LOGIN_MODES = ["worker", "employer"] as const;
type LoginMode = (typeof LOGIN_MODES)[number];

const getInitialMode = (): LoginMode => {
	const value = new URLSearchParams(window.location.search).get("as");
	return value === "worker" ? "worker" : "employer";
};

const LoginPage = React.memo(() => {
	const { t } = useTranslation();
	const [mode, setMode] = React.useState<LoginMode>(getInitialMode);

	const selectWorker = React.useCallback(() => setMode("worker"), []);
	const selectEmployer = React.useCallback(() => setMode("employer"), []);

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
					<Link to="/" className="flex items-center text-primary" aria-label="Wez">
						<WezLogo className="h-10 w-28" />
					</Link>
					<LanguageSwitcher />
				</div>
			</header>
			<main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_420px]">
				<section className="max-w-2xl space-y-4">
					<p className="text-sm font-medium text-primary">{t("landing.signIn")}</p>
					<h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("auth.customerLoginTitle")}</h1>
					<p className="text-muted-foreground">{t("auth.customerLoginBody")}</p>
				</section>
				<Card className="w-full">
					<CardHeader>
						<CardTitle>{mode === "worker" ? t("landing.workerTitle") : t("landing.employerTitle")}</CardTitle>
						<CardDescription>
							{mode === "worker" ? t("auth.workerLoginDesc") : t("auth.employerLoginDesc")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="grid grid-cols-2 rounded-md border bg-muted/40 p-1">
							<button
								type="button"
								onClick={selectWorker}
								className={`rounded px-3 py-2 text-sm transition ${
									mode === "worker" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
								}`}
							>
								{t("auth.loginAsWorker")}
							</button>
							<button
								type="button"
								onClick={selectEmployer}
								className={`rounded px-3 py-2 text-sm transition ${
									mode === "employer" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
								}`}
							>
								{t("auth.loginAsEmployer")}
							</button>
						</div>
						{mode === "worker" ? <WorkerLoginPanel /> : <EmailLoginForm submitLabel={t("auth.loginAsEmployer")} />}
					</CardContent>
				</Card>
			</main>
		</div>
	);
});
LoginPage.displayName = "LoginPage";

const WorkerLoginPanel = React.memo(() => {
	const { t } = useTranslation();
	const [method, setMethod] = React.useState<"phone" | "email">("phone");
	const choosePhone = React.useCallback(() => setMethod("phone"), []);
	const chooseEmail = React.useCallback(() => setMethod("email"), []);

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<Button type="button" variant={method === "phone" ? "default" : "outline"} size="sm" onClick={choosePhone}>
					{t("auth.phone")}
				</Button>
				<Button type="button" variant={method === "email" ? "default" : "outline"} size="sm" onClick={chooseEmail}>
					{t("auth.email")}
				</Button>
			</div>
			{method === "phone" ? <PhoneLoginForm /> : <EmailLoginForm submitLabel={t("auth.loginAsWorker")} />}
		</div>
	);
});
WorkerLoginPanel.displayName = "WorkerLoginPanel";

const EmailLoginForm = React.memo(({ submitLabel }: { readonly submitLabel: string }) => {
	const { t } = useTranslation();
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [error, setError] = React.useState("");
	const [loading, setLoading] = React.useState(false);

	const handleSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			setError("");
			setLoading(true);
			const { error: signInError } = await authClient.signIn.email({ email, password });
			if (signInError) {
				setError(signInError.message || t("common.error"));
				setLoading(false);
				return;
			}
			const session = await authClient.getSession();
			const role = (session.data?.user as { role?: string } | undefined)?.role;
			window.location.href = role === "worker" ? "/app/requests" : "/app/dashboard";
		},
		[email, password, t],
	);

	const handleEmailChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setEmail(event.target.value);
	}, []);

	const handlePasswordChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(event.target.value);
	}, []);

	return (
		<form onSubmit={handleSubmit}>
			<div className="space-y-4">
				{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
				<div className="space-y-2">
					<Label htmlFor="email">{t("auth.email")}</Label>
					<Input
						id="email"
						type="email"
						placeholder={t("auth.emailPlaceholder")}
						value={email}
						onChange={handleEmailChange}
						required
						autoComplete="email"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">{t("auth.password")}</Label>
					<Input
						id="password"
						type="password"
						value={password}
						onChange={handlePasswordChange}
						required
						autoComplete="current-password"
					/>
				</div>
			</div>
			<CardFooter className="px-0 pb-0 pt-4">
				<Button type="submit" className="w-full" disabled={loading}>
					{loading ? t("common.loading") : submitLabel}
				</Button>
			</CardFooter>
		</form>
	);
});
EmailLoginForm.displayName = "EmailLoginForm";

const PhoneLoginForm = React.memo(() => {
	const { t } = useTranslation();
	const [step, setStep] = React.useState<"phone" | "code">("phone");
	const [phone, setPhone] = React.useState("+2519");
	const [code, setCode] = React.useState("");
	const [error, setError] = React.useState("");
	const [busy, setBusy] = React.useState(false);

	const onPhoneChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setPhone(event.target.value);
	}, []);

	const onCodeChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setCode(event.target.value);
	}, []);

	const onSendCode = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
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
		async (event: React.FormEvent) => {
			event.preventDefault();
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

	const resetPhone = React.useCallback(() => {
		setStep("phone");
		setCode("");
		setError("");
	}, []);

	if (step === "code") {
		return (
			<form className="space-y-4" onSubmit={onVerify}>
				{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
				<p className="text-sm text-muted-foreground">{t("auth.phoneStepCode", { phone })}</p>
				<div className="space-y-2">
					<Label htmlFor="code">{t("auth.code")}</Label>
					<Input
						id="code"
						inputMode="numeric"
						pattern="\d{6}"
						maxLength={6}
						value={code}
						onChange={onCodeChange}
						placeholder="123456"
						required
					/>
				</div>
				<Button type="submit" className="w-full" disabled={busy}>
					{busy ? t("auth.verifying") : t("auth.verify")}
				</Button>
				<button type="button" onClick={resetPhone} className="w-full text-sm text-muted-foreground">
					{t("auth.useDifferentNumber")}
				</button>
			</form>
		);
	}

	return (
		<form className="space-y-4" onSubmit={onSendCode}>
			{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
			<p className="text-sm text-muted-foreground">{t("auth.phoneStepEnter")}</p>
			<div className="space-y-2">
				<Label htmlFor="phone">{t("auth.phone")}</Label>
				<Input
					id="phone"
					type="tel"
					value={phone}
					onChange={onPhoneChange}
					placeholder="+2519XXXXXXXX"
					autoComplete="tel"
					required
				/>
			</div>
			<Button type="submit" className="w-full" disabled={busy}>
				{busy ? t("auth.sending") : t("auth.sendCode")}
			</Button>
		</form>
	);
});
PhoneLoginForm.displayName = "PhoneLoginForm";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});
