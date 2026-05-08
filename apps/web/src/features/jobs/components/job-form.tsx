import React from "react";
import { useTranslation } from "react-i18next";
import type { Job, JobInput } from "#features/jobs/api/job.queries";
import { usePublicLocations } from "#features/locations/api/location.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CENTS_PER_BIRR = 100;

type JobFormValues = Omit<JobInput, "salaryMinCents" | "salaryMaxCents"> & {
	salaryMin: number | "";
	salaryMax: number | "";
};

type JobFormProps = {
	readonly initialJob?: Job;
	readonly submitLabel: string;
	readonly pending: boolean;
	readonly roleEditable?: boolean;
	readonly onSubmit: (input: JobInput) => Promise<void>;
};

const optionalValue = (value: string) => (value.trim().length > 0 ? value.trim() : undefined);
const centsToBirr = (value: string) => Number(value) / CENTS_PER_BIRR;

export const JobForm = React.memo(
	({ initialJob, submitLabel, pending, roleEditable = true, onSubmit }: JobFormProps) => {
		const { t } = useTranslation();
		const { data: roles } = usePublicRoles();
		const { data: localities } = usePublicLocations({ kind: "locality" });
		const [error, setError] = React.useState("");
		const [values, setValues] = React.useState<JobFormValues>({
			roleId: initialJob?.roleId ?? "",
			title: initialJob?.title ?? "",
			description: initialJob?.description ?? "",
			schedule: initialJob?.schedule ?? "",
			requirements: initialJob?.requirements ?? "",
			perks: initialJob?.perks ?? "",
			salaryMin: initialJob ? centsToBirr(initialJob.salaryMinCents) : "",
			salaryMax: initialJob ? centsToBirr(initialJob.salaryMaxCents) : "",
			location: initialJob?.location ?? "",
			autoCloseOnPlacement: initialJob?.autoCloseOnPlacement ?? true,
		});

		const selectedRole = React.useMemo(() => roles?.find((role) => role.id === values.roleId), [roles, values.roleId]);
		const roleSalaryMin = React.useMemo(
			() => (selectedRole ? Number(selectedRole.salaryMinCents) / CENTS_PER_BIRR : 0),
			[selectedRole],
		);
		const roleSalaryMax = React.useMemo(
			() => (selectedRole ? Number(selectedRole.salaryMaxCents) / CENTS_PER_BIRR : 0),
			[selectedRole],
		);
		const salaryInvalid = React.useMemo(
			() =>
				values.salaryMin === "" ||
				values.salaryMax === "" ||
				values.salaryMin > values.salaryMax ||
				(selectedRole ? values.salaryMin < roleSalaryMin || values.salaryMax > roleSalaryMax : false),
			[roleSalaryMax, roleSalaryMin, selectedRole, values.salaryMax, values.salaryMin],
		);

		React.useEffect(() => {
			if (!selectedRole || initialJob || !roleEditable) return;
			setValues((current) => ({
				...current,
				salaryMin: Number(selectedRole.salaryMinCents) / CENTS_PER_BIRR,
				salaryMax: Number(selectedRole.salaryMaxCents) / CENTS_PER_BIRR,
			}));
		}, [initialJob, roleEditable, selectedRole]);

		const updateText = React.useCallback(
			(
				field: keyof Pick<
					JobFormValues,
					"roleId" | "title" | "description" | "schedule" | "requirements" | "perks" | "location"
				>,
			) =>
				(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
					setValues((current) => ({ ...current, [field]: e.target.value })),
			[],
		);

		const updateSalary = React.useCallback(
			(field: keyof Pick<JobFormValues, "salaryMin" | "salaryMax">) => (e: React.ChangeEvent<HTMLInputElement>) =>
				setValues((current) => ({ ...current, [field]: e.target.value === "" ? "" : Number(e.target.value) })),
			[],
		);

		const updateAutoClose = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setValues((current) => ({ ...current, autoCloseOnPlacement: e.target.checked }));
		}, []);

		const handleSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				if (salaryInvalid || values.salaryMin === "" || values.salaryMax === "") {
					setError(t("jobs.salaryRangeRequired", { min: roleSalaryMin, max: roleSalaryMax }));
					return;
				}
				try {
					await onSubmit({
						roleId: values.roleId,
						title: values.title,
						description: values.description,
						schedule: optionalValue(values.schedule ?? ""),
						requirements: optionalValue(values.requirements ?? ""),
						perks: optionalValue(values.perks ?? ""),
						salaryMinCents: Math.round(values.salaryMin * CENTS_PER_BIRR),
						salaryMaxCents: Math.round(values.salaryMax * CENTS_PER_BIRR),
						location: values.location,
						autoCloseOnPlacement: values.autoCloseOnPlacement,
					});
				} catch (err) {
					setError(err instanceof Error ? err.message : t("common.error"));
				}
			},
			[onSubmit, roleSalaryMax, roleSalaryMin, salaryInvalid, t, values],
		);

		return (
			<form onSubmit={handleSubmit} className="space-y-4">
				{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
				<div className="space-y-2">
					<Label htmlFor="role">{t("workers.register.roles")}</Label>
					<select
						id="role"
						value={values.roleId}
						onChange={updateText("roleId")}
						disabled={!roleEditable}
						required
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
					>
						<option value="">-</option>
						{roles?.map((role) => (
							<option key={role.id} value={role.id}>
								{role.name}
							</option>
						))}
					</select>
					{selectedRole && (
						<p className="text-xs text-muted-foreground">
							{t("jobs.roleRange", {
								min: (Number(selectedRole.salaryMinCents) / CENTS_PER_BIRR).toLocaleString(),
								max: (Number(selectedRole.salaryMaxCents) / CENTS_PER_BIRR).toLocaleString(),
							})}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="title">{t("jobs.jobTitle")}</Label>
					<Input id="title" value={values.title} onChange={updateText("title")} required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="description">{t("jobs.description")}</Label>
					<textarea
						id="description"
						value={values.description}
						onChange={updateText("description")}
						required
						className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
				</div>
				<div className="grid gap-3 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="salaryMin">{t("jobs.salaryMin")}</Label>
						<Input
							id="salaryMin"
							type="number"
							min={roleSalaryMin}
							max={roleSalaryMax || undefined}
							value={values.salaryMin}
							onChange={updateSalary("salaryMin")}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="salaryMax">{t("jobs.salaryMax")}</Label>
						<Input
							id="salaryMax"
							type="number"
							min={roleSalaryMin}
							max={roleSalaryMax || undefined}
							value={values.salaryMax}
							onChange={updateSalary("salaryMax")}
							required
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="location">{t("jobs.location")}</Label>
					<select
						id="location"
						value={values.location}
						onChange={updateText("location")}
						required
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">-</option>
						{localities?.map((locality) => (
							<option key={locality.id} value={locality.code}>
								{locality.nameEn}
							</option>
						))}
					</select>
				</div>
				<div className="grid gap-3 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="schedule">{t("jobs.schedule")}</Label>
						<textarea
							id="schedule"
							value={values.schedule ?? ""}
							onChange={updateText("schedule")}
							className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="requirements">{t("jobs.requirements")}</Label>
						<textarea
							id="requirements"
							value={values.requirements ?? ""}
							onChange={updateText("requirements")}
							className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="perks">{t("jobs.perks")}</Label>
						<textarea
							id="perks"
							value={values.perks ?? ""}
							onChange={updateText("perks")}
							className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</div>
				</div>
				<label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
					<input
						type="checkbox"
						checked={values.autoCloseOnPlacement}
						onChange={updateAutoClose}
						className="mt-1 size-4"
					/>
					<span>
						<span className="block font-medium">{t("jobs.autoCloseOnPlacement")}</span>
						<span className="block text-muted-foreground">{t("jobs.autoCloseOnPlacementBody")}</span>
					</span>
				</label>
				<Button type="submit" disabled={pending || salaryInvalid}>
					{pending ? t("common.saving") : submitLabel}
				</Button>
			</form>
		);
	},
);
JobForm.displayName = "JobForm";
