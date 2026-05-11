import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSignupEmployer } from "#features/employers/api/employer.queries";
import { LocationHierarchySelect, type LocationHierarchySelection } from "#shared/components/LocationHierarchySelect";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
	component: EmployerSignupPage,
});

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const FAYDA = /^F-\d{4}-\d{4}-[A-Z]{2}$/;

type EmployerSignupForm = {
	readonly type: "business" | "household";
	readonly name: string;
	readonly contactName: string;
	readonly phone: string;
	readonly email: string;
	readonly password: string;
	readonly area: string;
	readonly tin: string;
	readonly businessLicense: string;
	readonly businessLicenseExpiresAt: string;
	readonly businessAddress: string;
	readonly businessCategory: string;
	readonly fayda: string;
	readonly secondaryContact: string;
};

const validateSignupForm = (form: EmployerSignupForm, t: (key: string) => string) => {
	if (!ETHIOPIAN_PHONE.test(form.phone)) return t("workers.register.invalidPhone");
	if (form.type === "household" && form.fayda && !FAYDA.test(form.fayda)) return t("workers.register.invalidFayda");
	if (form.type === "business" && new Date(form.businessLicenseExpiresAt).getTime() <= Date.now()) {
		return t("employers.licenseExpired");
	}
	return "";
};

const buildSignupPayload = (form: EmployerSignupForm) => ({
	type: form.type,
	name: form.name,
	contactName: form.contactName || undefined,
	phone: form.phone,
	email: form.email,
	area: form.area,
	tin: form.type === "business" ? form.tin : undefined,
	businessLicense: form.type === "business" ? form.businessLicense : undefined,
	businessLicenseExpiresAt: form.type === "business" ? form.businessLicenseExpiresAt : undefined,
	businessAddress: form.type === "business" ? form.businessAddress || undefined : undefined,
	businessCategory: form.type === "business" ? form.businessCategory || undefined : undefined,
	fayda: form.type === "household" ? form.fayda : undefined,
	secondaryContact: form.type === "household" ? form.secondaryContact || undefined : undefined,
	loginEmail: form.email,
	loginPassword: form.password,
});

function EmployerSignupPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const signupEmployer = useSignupEmployer();

	const [type, setType] = React.useState<"business" | "household">("business");
	const [name, setName] = React.useState("");
	const [contactName, setContactName] = React.useState("");
	const [phone, setPhone] = React.useState("+2519");
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [area, setArea] = React.useState("");
	const [tin, setTin] = React.useState("");
	const [businessLicense, setBusinessLicense] = React.useState("");
	const [businessLicenseExpiresAt, setBusinessLicenseExpiresAt] = React.useState("");
	const [businessAddress, setBusinessAddress] = React.useState("");
	const [businessCategory, setBusinessCategory] = React.useState("");
	const [fayda, setFayda] = React.useState("");
	const [secondaryContact, setSecondaryContact] = React.useState("");
	const [error, setError] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [location, setLocation] = React.useState<LocationHierarchySelection>({});

	const onLocationChange = React.useCallback((next: LocationHierarchySelection) => {
		setLocation(next);
		setArea(next.localityCode ?? "");
	}, []);

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			const form = {
				type,
				name,
				contactName,
				phone,
				email,
				password,
				area,
				tin,
				businessLicense,
				businessLicenseExpiresAt,
				businessAddress,
				businessCategory,
				fayda,
				secondaryContact,
			};
			const validationError = validateSignupForm(form, t);
			if (validationError) {
				setError(validationError);
				return;
			}
			setBusy(true);
			try {
				await signupEmployer.mutateAsync(buildSignupPayload(form));
				const signIn = await authClient.signIn.email({ email, password });
				if (signIn.error) throw new Error(signIn.error.message ?? t("common.error"));

				navigate({ to: "/app/dashboard" });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			} finally {
				setBusy(false);
			}
		},
		[
			type,
			name,
			contactName,
			phone,
			email,
			password,
			area,
			tin,
			businessLicense,
			businessLicenseExpiresAt,
			businessAddress,
			businessCategory,
			fayda,
			secondaryContact,
			signupEmployer,
			navigate,
			t,
		],
	);

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{t("landing.employerSignupTitle")}</CardTitle>
					<CardDescription>{t("landing.employerSignupDesc")}</CardDescription>
				</CardHeader>
				<form onSubmit={onSubmit}>
					<CardContent className="space-y-3">
						{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label>{t("landing.employerType")}</Label>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setType("business")}
									className={`px-3 py-2 rounded-md border text-sm ${
										type === "business" ? "bg-primary text-primary-foreground border-primary" : ""
									}`}
								>
									{t("landing.business")}
								</button>
								<button
									type="button"
									onClick={() => setType("household")}
									className={`px-3 py-2 rounded-md border text-sm ${
										type === "household" ? "bg-primary text-primary-foreground border-primary" : ""
									}`}
								>
									{t("landing.household")}
								</button>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="name">{t("landing.businessOrName")}</Label>
							<Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label htmlFor="contactName">{t("landing.contactName")}</Label>
							<Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor="phone">{t("workers.register.phone")}</Label>
								<Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">{t("auth.email")}</Label>
								<Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">{t("auth.password")}</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								minLength={8}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label>{t("workers.register.location")}</Label>
							<LocationHierarchySelect
								idPrefix="employer-signup-location"
								value={location}
								onChange={onLocationChange}
								required
								className="space-y-3"
							/>
						</div>
						{type === "business" ? (
							<>
								<div className="space-y-2">
									<Label htmlFor="tin">TIN</Label>
									<Input id="tin" value={tin} onChange={(e) => setTin(e.target.value)} required />
								</div>
								<div className="space-y-2">
									<Label htmlFor="lic">{t("landing.businessLicense")}</Label>
									<Input
										id="lic"
										value={businessLicense}
										onChange={(e) => setBusinessLicense(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="licenseExpiry">{t("employers.licenseExpiry")}</Label>
									<Input
										id="licenseExpiry"
										type="date"
										value={businessLicenseExpiresAt}
										onChange={(e) => setBusinessLicenseExpiresAt(e.target.value)}
										required
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-2">
										<Label htmlFor="businessCategory">{t("employers.businessCategory")}</Label>
										<Input
											id="businessCategory"
											value={businessCategory}
											onChange={(e) => setBusinessCategory(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="businessAddress">{t("employers.businessAddress")}</Label>
										<Input
											id="businessAddress"
											value={businessAddress}
											onChange={(e) => setBusinessAddress(e.target.value)}
										/>
									</div>
								</div>
							</>
						) : (
							<>
								<div className="space-y-2">
									<Label htmlFor="fayda">{t("workers.register.fayda")}</Label>
									<Input
										id="fayda"
										value={fayda}
										onChange={(e) => setFayda(e.target.value)}
										placeholder="F-XXXX-XXXX-XX"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="secondaryContact">{t("employers.secondaryContact")}</Label>
									<Input
										id="secondaryContact"
										value={secondaryContact}
										onChange={(e) => setSecondaryContact(e.target.value)}
									/>
								</div>
							</>
						)}
					</CardContent>
					<CardFooter className="flex flex-col gap-3">
						<Button type="submit" className="w-full" disabled={busy}>
							{busy ? t("common.saving") : t("landing.createAccount")}
						</Button>
						<Link to="/" className="text-sm text-muted-foreground">
							&larr; {t("common.back")}
						</Link>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
