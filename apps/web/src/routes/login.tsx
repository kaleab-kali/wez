import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

const LoginForm = React.memo(
	() => {
		const { t } = useTranslation();
		const [email, setEmail] = React.useState("");
		const [password, setPassword] = React.useState("");
		const [error, setError] = React.useState("");
		const [loading, setLoading] = React.useState(false);

		const handleSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setLoading(true);

				const { error: signInError } = await authClient.signIn.email({
					email,
					password,
				});

				if (signInError) {
					setError(signInError.message || t("common.error"));
					setLoading(false);
					return;
				}

				window.location.href = "/app/dashboard";
				return;
			},
			[email, password, t],
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
					<CardTitle className="text-2xl font-bold text-center">{t("auth.signIn")}</CardTitle>
					<CardDescription className="text-center">{t("auth.signInDesc")}</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="email">{t("auth.email")}</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@company.com"
								value={email}
								onChange={handleEmailChange}
								required
								autoComplete="email"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">{t("auth.password")}</Label>
							<Input
								id="password"
								type="password"
								placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
								value={password}
								onChange={handlePasswordChange}
								required
								autoComplete="current-password"
							/>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-4">
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? t("common.loading") : t("auth.signIn")}
						</Button>
						<Link to="/login-phone" className="text-sm text-muted-foreground">
							Worker? Sign in with phone
						</Link>
					</CardFooter>
				</form>
			</Card>
		);
	},
	() => true,
);
LoginForm.displayName = "LoginForm";

function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4 relative">
			<div className="absolute top-4 right-4">
				<LanguageSwitcher />
			</div>
			<LoginForm />
		</div>
	);
}
