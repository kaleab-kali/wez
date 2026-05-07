import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useCreateEmployer } from "#features/employers/api/employer.queries";
import { useLookupKind } from "#features/lookups/api/lookup.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff/employers/new")({
	component: RegisterEmployerPage,
});

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const FAYDA = /^F-\d{4}-\d{4}-[A-Z]{2}$/;

type EmployerFormState = {
	readonly type: "business" | "household";
	readonly name: string;
	readonly contactName: string;
	readonly phone: string;
	readonly email: string;
	readonly area: string;
	readonly tin: string;
	readonly businessLicense: string;
	readonly businessLicenseExpiresAt: string;
	readonly businessAddress: string;
	readonly businessCategory: string;
	readonly fayda: string;
	readonly secondaryContact: string;
};

const validateEmployerForm = (form: EmployerFormState, t: (key: string) => string) => {
	if (!ETHIOPIAN_PHONE.test(form.phone)) return t("workers.register.invalidPhone");
	if (form.type === "household" && form.fayda && !FAYDA.test(form.fayda)) return t("workers.register.invalidFayda");
	if (
		form.type === "business" &&
		form.businessLicenseExpiresAt &&
		new Date(form.businessLicenseExpiresAt).getTime() <= Date.now()
	) {
		return t("employers.licenseExpired");
	}
	return "";
};

const buildEmployerPayload = (form: EmployerFormState) => ({
	type: form.type,
	name: form.name,
	contactName: form.contactName || undefined,
	phone: form.phone,
	email: form.email || undefined,
	area: form.area,
	tin: form.type === "business" ? form.tin : undefined,
	businessLicense: form.type === "business" ? form.businessLicense : undefined,
	businessLicenseExpiresAt: form.type === "business" ? form.businessLicenseExpiresAt : undefined,
	businessAddress: form.type === "business" ? form.businessAddress || undefined : undefined,
	businessCategory: form.type === "business" ? form.businessCategory || undefined : undefined,
	fayda: form.type === "household" ? form.fayda : undefined,
	secondaryContact: form.type === "household" ? form.secondaryContact || undefined : undefined,
});

function RegisterEmployerPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const createE = useCreateEmployer();
	const { data: woredas } = useLookupKind("woredas");

	const [type, setType] = React.useState<"business" | "household">("business");
	const [name, setName] = React.useState("");
	const [contactName, setContactName] = React.useState("");
	const [phone, setPhone] = React.useState("+2519");
	const [email, setEmail] = React.useState("");
	const [area, setArea] = React.useState("");
	const [tin, setTin] = React.useState("");
	const [businessLicense, setBusinessLicense] = React.useState("");
	const [businessLicenseExpiresAt, setBusinessLicenseExpiresAt] = React.useState("");
	const [businessAddress, setBusinessAddress] = React.useState("");
	const [businessCategory, setBusinessCategory] = React.useState("");
	const [fayda, setFayda] = React.useState("");
	const [secondaryContact, setSecondaryContact] = React.useState("");
	const [error, setError] = React.useState("");

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
				area,
				tin,
				businessLicense,
				businessLicenseExpiresAt,
				businessAddress,
				businessCategory,
				fayda,
				secondaryContact,
			};
			const validationError = validateEmployerForm(form, t);
			if (validationError) {
				setError(validationError);
				return;
			}
			try {
				const created = await createE.mutateAsync(buildEmployerPayload(form));
				navigate({ to: "/staff/employers/$id", params: { id: created.id } });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[
			type,
			name,
			contactName,
			phone,
			email,
			area,
			tin,
			businessLicense,
			businessLicenseExpiresAt,
			businessAddress,
			businessCategory,
			fayda,
			secondaryContact,
			createE,
			navigate,
			t,
		],
	);

	return (
		<div className="max-w-2xl space-y-4">
			<div>
				<Link to="/staff/employers" className="text-sm text-muted-foreground hover:text-foreground">
					&larr; {t("employers.title")}
				</Link>
				<h1 className="text-2xl font-bold tracking-tight mt-2">{t("employers.register")}</h1>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>{t("landing.employerSignupTitle")}</CardTitle>
					<CardDescription>{t("landing.employerSignupDesc")}</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-3">
						{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label>{t("landing.employerType")}</Label>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setType("business")}
									className={`px-3 py-2 rounded-md border text-sm ${type === "business" ? "bg-primary text-primary-foreground border-primary" : ""}`}
								>
									{t("landing.business")}
								</button>
								<button
									type="button"
									onClick={() => setType("household")}
									className={`px-3 py-2 rounded-md border text-sm ${type === "household" ? "bg-primary text-primary-foreground border-primary" : ""}`}
								>
									{t("landing.household")}
								</button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor="name">{t("landing.businessOrName")}</Label>
								<Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
							</div>
							<div className="space-y-2">
								<Label htmlFor="contactName">{t("landing.contactName")}</Label>
								<Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor="phone">{t("workers.register.phone")}</Label>
								<Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">{t("auth.email")}</Label>
								<Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="area">{t("workers.register.woreda")}</Label>
							<select
								id="area"
								value={area}
								onChange={(e) => setArea(e.target.value)}
								required
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">—</option>
								{woredas?.map((w) => (
									<option key={w.value} value={w.value}>
										{w.labelEn}
									</option>
								))}
							</select>
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
						<Button type="submit" className="w-full" disabled={createE.isPending}>
							{createE.isPending ? t("common.saving") : t("common.create")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
