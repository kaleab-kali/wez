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
	const [fayda, setFayda] = React.useState("");
	const [error, setError] = React.useState("");

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			if (!ETHIOPIAN_PHONE.test(phone)) {
				setError(t("workers.register.invalidPhone"));
				return;
			}
			if (type === "household" && fayda && !FAYDA.test(fayda)) {
				setError(t("workers.register.invalidFayda"));
				return;
			}
			try {
				const created = await createE.mutateAsync({
					type,
					name,
					contactName: contactName || undefined,
					phone,
					email: email || undefined,
					area,
					tin: type === "business" ? tin : undefined,
					businessLicense: type === "business" ? businessLicense : undefined,
					fayda: type === "household" ? fayda : undefined,
				});
				navigate({ to: "/employers/$id", params: { id: created.id } });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[type, name, contactName, phone, email, area, tin, businessLicense, fayda, createE, navigate, t],
	);

	return (
		<div className="max-w-2xl space-y-4">
			<div>
				<Link to="/employers" className="text-sm text-muted-foreground hover:text-foreground">
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
									<Input id="lic" value={businessLicense} onChange={(e) => setBusinessLicense(e.target.value)} required />
								</div>
							</>
						) : (
							<div className="space-y-2">
								<Label htmlFor="fayda">{t("workers.register.fayda")}</Label>
								<Input id="fayda" value={fayda} onChange={(e) => setFayda(e.target.value)} placeholder="F-XXXX-XXXX-XX" required />
							</div>
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
