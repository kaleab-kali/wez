import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLookupKind } from "#features/lookups/api/lookup.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { usePublicStations } from "#features/stations/api/station.queries";
import { useRegisterWorker } from "#features/workers/api/worker.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/staff/workers/new")({
	component: NewWorkerPage,
});

const ETHIOPIAN_PHONE = /^\+2519\d{8}$/;
const FAYDA = /^F-\d{4}-\d{4}-[A-Z]{2}$/;

type FormState = {
	fullName: string;
	fayda: string;
	phone: string;
	dateOfBirth: string;
	gender: "M" | "F";
	area: string;
	bio: string;
	religion: string;
	languages: string[];
	experienceYears: number;
	hasHealthCard: boolean;
	hasPoliceClearance: boolean;
	tin: string;
	roles: string[];
	stationId: string;
};
type SetState = (patch: Partial<FormState>) => void;

const initialState: FormState = {
	fullName: "",
	fayda: "",
	phone: "+2519",
	dateOfBirth: "",
	gender: "F",
	area: "",
	bio: "",
	religion: "",
	languages: [],
	experienceYears: 0,
	hasHealthCard: false,
	hasPoliceClearance: false,
	tin: "",
	roles: [],
	stationId: "",
};

const StepIdentity = React.memo(
	({
		state,
		set,
		onNext,
	}: {
		readonly state: FormState;
		readonly set: SetState;
		readonly onNext: () => void;
	}) => {
		const { t } = useTranslation();
		const { data: woredas } = useLookupKind("woredas");
		return (
			<form
				className="grid grid-cols-1 md:grid-cols-2 gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					onNext();
				}}
			>
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="fullName">{t("workers.register.fullName")}</Label>
					<Input id="fullName" value={state.fullName} onChange={(e) => set({ fullName: e.target.value })} required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="fayda">{t("workers.register.fayda")}</Label>
					<Input
						id="fayda"
						value={state.fayda}
						onChange={(e) => set({ fayda: e.target.value })}
						placeholder={t("workers.register.faydaPlaceholder")}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="phone">{t("workers.register.phone")}</Label>
					<Input
						id="phone"
						value={state.phone}
						onChange={(e) => set({ phone: e.target.value })}
						placeholder={t("workers.register.phonePlaceholder")}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="dob">{t("workers.register.dob")}</Label>
					<Input id="dob" type="date" value={state.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="gender">{t("workers.register.gender")}</Label>
					<select
						id="gender"
						value={state.gender}
						onChange={(e) => set({ gender: e.target.value as "M" | "F" })}
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="F">{t("workers.genderF")}</option>
						<option value="M">{t("workers.genderM")}</option>
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="area">{t("workers.register.woreda")}</Label>
					<select
						id="area"
						value={state.area}
						onChange={(e) => set({ area: e.target.value })}
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
				<div className="md:col-span-2 flex justify-end">
					<Button type="submit">{t("common.next")}</Button>
				</div>
			</form>
		);
	},
);
StepIdentity.displayName = "StepIdentity";

const StepSkills = React.memo(
	({
		state,
		set,
		onNext,
		onBack,
	}: {
		readonly state: FormState;
		readonly set: SetState;
		readonly onNext: () => void;
		readonly onBack: () => void;
	}) => {
		const { t } = useTranslation();
		const { data: roles } = usePublicRoles();
		const { data: languages } = useLookupKind("languages");
		const { data: religions } = useLookupKind("religions");
		const toggleLang = React.useCallback(
			(lang: string) => {
				set({
					languages: state.languages.includes(lang)
						? state.languages.filter((l) => l !== lang)
						: [...state.languages, lang],
				});
			},
			[state.languages, set],
		);
		const toggleRole = React.useCallback(
			(roleId: string) => {
				set({
					roles: state.roles.includes(roleId)
						? state.roles.filter((r) => r !== roleId)
						: [...state.roles, roleId],
				});
			},
			[state.roles, set],
		);
		return (
			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					onNext();
				}}
			>
				<div>
					<Label>{t("workers.register.languages")}</Label>
					<div className="flex flex-wrap gap-2 mt-2">
						{languages?.map((l) => (
							<button
								type="button"
								key={l.value}
								onClick={() => toggleLang(l.value)}
								className={`px-3 py-1 rounded-full border text-sm transition ${
									state.languages.includes(l.value)
										? "bg-primary text-primary-foreground border-primary"
										: "hover:bg-muted"
								}`}
							>
								{l.labelEn}
							</button>
						))}
					</div>
				</div>
				<div>
					<Label>{t("workers.register.roles")}</Label>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
						{roles?.map((r) => (
							<label
								key={r.id}
								className="flex items-center gap-2 text-sm border rounded-md p-2.5 cursor-pointer hover:bg-muted/50 transition"
							>
								<input
									type="checkbox"
									checked={state.roles.includes(r.id)}
									onChange={() => toggleRole(r.id)}
									className="size-4 rounded border-input"
								/>
								<span className="min-w-0">
									<span className="block truncate">{r.name}</span>
									<span className="text-muted-foreground text-[11px]">{r.category}</span>
								</span>
							</label>
						))}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label htmlFor="exp">{t("workers.register.experience")}</Label>
						<Input
							id="exp"
							type="number"
							min={0}
							max={60}
							value={state.experienceYears}
							onChange={(e) => set({ experienceYears: Number(e.target.value) })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="religion">{t("workers.register.religion")}</Label>
						<select
							id="religion"
							value={state.religion}
							onChange={(e) => set({ religion: e.target.value })}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">—</option>
							{religions?.map((r) => (
								<option key={r.value} value={r.value}>
									{r.labelEn}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="bio">{t("workers.register.bio")}</Label>
					<textarea
						id="bio"
						value={state.bio}
						onChange={(e) => set({ bio: e.target.value })}
						maxLength={500}
						className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>
				<div className="flex justify-between">
					<Button type="button" variant="outline" onClick={onBack}>
						{t("common.back")}
					</Button>
					<Button type="submit" disabled={state.languages.length === 0 || state.roles.length === 0}>
						{t("common.next")}
					</Button>
				</div>
			</form>
		);
	},
);
StepSkills.displayName = "StepSkills";

const StepVerification = React.memo(
	({
		state,
		set,
		onSubmit,
		onBack,
		busy,
		error,
		stations,
	}: {
		readonly state: FormState;
		readonly set: SetState;
		readonly onSubmit: () => void;
		readonly onBack: () => void;
		readonly busy: boolean;
		readonly error: string;
		readonly stations: { id: string; name: string }[];
	}) => {
		const { t } = useTranslation();
		return (
			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit();
				}}
			>
				{error && <div className="rounded bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>}
				<div className="space-y-2">
					<label className="flex items-center gap-2 text-sm cursor-pointer">
						<input
							type="checkbox"
							checked={state.hasHealthCard}
							onChange={(e) => set({ hasHealthCard: e.target.checked })}
							className="size-4 rounded border-input"
						/>
						{t("workers.register.hasHealthCard")}
					</label>
					<label className="flex items-center gap-2 text-sm cursor-pointer">
						<input
							type="checkbox"
							checked={state.hasPoliceClearance}
							onChange={(e) => set({ hasPoliceClearance: e.target.checked })}
							className="size-4 rounded border-input"
						/>
						{t("workers.register.hasPoliceClearance")}
					</label>
				</div>
				<div className="space-y-2">
					<Label htmlFor="tin">{t("workers.register.tin")}</Label>
					<Input id="tin" value={state.tin} onChange={(e) => set({ tin: e.target.value })} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="station">{t("workers.register.station")}</Label>
					<select
						id="station"
						value={state.stationId}
						onChange={(e) => set({ stationId: e.target.value })}
						required
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">{t("workers.register.stationPlaceholder")}</option>
						{stations.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</div>
				<div className="flex justify-between">
					<Button type="button" variant="outline" onClick={onBack}>
						{t("common.back")}
					</Button>
					<Button type="submit" disabled={busy || !state.stationId}>
						{busy ? t("workers.register.submitting") : t("workers.register.submit")}
					</Button>
				</div>
			</form>
		);
	},
);
StepVerification.displayName = "StepVerification";

function NewWorkerPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const register = useRegisterWorker();
	const { data: stations } = usePublicStations();
	const [step, setStep] = React.useState<1 | 2 | 3>(1);
	const [state, setState] = React.useState<FormState>(initialState);
	const [error, setError] = React.useState("");

	const set: SetState = React.useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);

	const goToSkills = React.useCallback(() => {
		setError("");
		if (!FAYDA.test(state.fayda)) {
			setError(t("workers.register.invalidFayda"));
			return;
		}
		if (!ETHIOPIAN_PHONE.test(state.phone)) {
			setError(t("workers.register.invalidPhone"));
			return;
		}
		setStep(2);
	}, [state, t]);

	const goToVerify = React.useCallback(() => {
		setError("");
		setStep(3);
	}, []);

	const onSubmit = React.useCallback(async () => {
		setError("");
		try {
			const created = await register.mutateAsync({
				fullName: state.fullName,
				fayda: state.fayda,
				phone: state.phone,
				gender: state.gender,
				area: state.area,
				bio: state.bio || undefined,
				religion: state.religion || undefined,
				languages: state.languages,
				experienceYears: state.experienceYears,
				hasHealthCard: state.hasHealthCard,
				hasPoliceClearance: state.hasPoliceClearance,
				tin: state.tin || undefined,
				roles: state.roles,
				stationId: state.stationId,
			});
			navigate({ to: "/workers/$id", params: { id: created.id } });
		} catch (err) {
			setError(err instanceof Error ? err.message : t("common.error"));
		}
	}, [register, state, navigate, t]);

	const stepTitle =
		step === 1
			? t("workers.register.step1Title")
			: step === 2
				? t("workers.register.step2Title")
				: t("workers.register.step3Title");
	const stepDesc =
		step === 1
			? t("workers.register.step1Desc")
			: step === 2
				? t("workers.register.step2Desc")
				: t("workers.register.step3Desc");

	return (
		<div className="max-w-3xl space-y-4">
			<div>
				<Link to="/workers" className="text-sm text-muted-foreground hover:text-foreground transition">
					&larr; {t("workers.profile.backToWorkers")}
				</Link>
				<h1 className="text-2xl font-bold tracking-tight mt-2">{t("workers.register.title")}</h1>
				<p className="text-sm text-muted-foreground mt-1">
					{t("workers.register.step", { n: step, total: 3 })}
				</p>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>{stepTitle}</CardTitle>
					<CardDescription>{stepDesc}</CardDescription>
				</CardHeader>
				<CardContent>
					{step === 1 && <StepIdentity state={state} set={set} onNext={goToSkills} />}
					{step === 2 && <StepSkills state={state} set={set} onNext={goToVerify} onBack={() => setStep(1)} />}
					{step === 3 && (
						<StepVerification
							state={state}
							set={set}
							onSubmit={onSubmit}
							onBack={() => setStep(2)}
							busy={register.isPending}
							error={error}
							stations={stations ?? []}
						/>
					)}
					{error && step !== 3 && (
						<div className="mt-3 rounded bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
