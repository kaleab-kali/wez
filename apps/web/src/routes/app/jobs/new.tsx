import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useCreateJob } from "#features/jobs/api/job.queries";
import { useLookupKind } from "#features/lookups/api/lookup.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/jobs/new")({
	component: NewCustomerJobPage,
});

function NewCustomerJobPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const createJob = useCreateJob();
	const { data: roles } = usePublicRoles();
	const { data: woredas } = useLookupKind("woredas");

	const [roleId, setRoleId] = React.useState("");
	const [title, setTitle] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [salaryMin, setSalaryMin] = React.useState<number | "">("");
	const [salaryMax, setSalaryMax] = React.useState<number | "">("");
	const [location, setLocation] = React.useState("");
	const [error, setError] = React.useState("");

	const selectedRole = React.useMemo(() => roles?.find((role) => role.id === roleId), [roles, roleId]);
	const roleSalaryMin = React.useMemo(
		() => (selectedRole ? Number(selectedRole.salaryMinCents) / 100 : 0),
		[selectedRole],
	);
	const roleSalaryMax = React.useMemo(
		() => (selectedRole ? Number(selectedRole.salaryMaxCents) / 100 : 0),
		[selectedRole],
	);
	const salaryInvalid = React.useMemo(
		() =>
			salaryMin === "" ||
			salaryMax === "" ||
			salaryMin > salaryMax ||
			(selectedRole ? salaryMin < roleSalaryMin || salaryMax > roleSalaryMax : false),
		[roleSalaryMax, roleSalaryMin, salaryMax, salaryMin, selectedRole],
	);

	React.useEffect(() => {
		if (!selectedRole) return;
		setSalaryMin(Number(selectedRole.salaryMinCents) / 100);
		setSalaryMax(Number(selectedRole.salaryMaxCents) / 100);
	}, [selectedRole]);

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			if (salaryInvalid || salaryMin === "" || salaryMax === "") {
				setError(t("jobs.salaryRangeRequired", { min: roleSalaryMin, max: roleSalaryMax }));
				return;
			}
			try {
				await createJob.mutateAsync({
					roleId,
					title,
					description,
					salaryMinCents: Math.round(salaryMin * 100),
					salaryMaxCents: Math.round(salaryMax * 100),
					location,
				});
				navigate({ to: "/app/jobs" });
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[
			createJob,
			description,
			location,
			navigate,
			roleId,
			roleSalaryMax,
			roleSalaryMin,
			salaryInvalid,
			salaryMax,
			salaryMin,
			t,
			title,
		],
	);

	return (
		<div className="max-w-2xl space-y-4">
			<Link to="/app/jobs" className="text-sm text-muted-foreground hover:text-foreground">
				&lt;- {t("jobs.title")}
			</Link>
			<Card>
				<CardHeader>
					<CardTitle>{t("jobs.postJob")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-4">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="role">{t("workers.register.roles")}</Label>
							<select
								id="role"
								value={roleId}
								onChange={(e) => setRoleId(e.target.value)}
								required
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
										min: (Number(selectedRole.salaryMinCents) / 100).toLocaleString(),
										max: (Number(selectedRole.salaryMaxCents) / 100).toLocaleString(),
									})}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="title">{t("jobs.jobTitle")}</Label>
							<Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">{t("jobs.description")}</Label>
							<textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
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
									value={salaryMin}
									onChange={(e) => setSalaryMin(e.target.value === "" ? "" : Number(e.target.value))}
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
									value={salaryMax}
									onChange={(e) => setSalaryMax(e.target.value === "" ? "" : Number(e.target.value))}
									required
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="location">{t("jobs.location")}</Label>
							<select
								id="location"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								required
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">-</option>
								{woredas?.map((woreda) => (
									<option key={woreda.value} value={woreda.value}>
										{woreda.labelEn}
									</option>
								))}
							</select>
						</div>
						<Button type="submit" disabled={createJob.isPending || salaryInvalid}>
							{createJob.isPending ? t("common.saving") : t("jobs.postJob")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
