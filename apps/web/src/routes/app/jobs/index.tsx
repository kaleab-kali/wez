import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { type Job, type JobFilter, useCloseJob, useJobs } from "#features/jobs/api/job.queries";
import { usePublicLocations } from "#features/locations/api/location.queries";
import { usePublicRoles } from "#features/role-catalog/api/role.queries";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const JOB_STATUS_VARIANT: Record<Job["status"], "default" | "secondary" | "outline" | "destructive"> = {
	open: "default",
	closed: "outline",
	filled: "secondary",
};
const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);
const CENTS_PER_BIRR = 100;
const JOB_PAGE_LIMIT = 20;
const POSTED_WITHIN_OPTIONS = [7, 30, 90] as const;
const EMPLOYER_TYPE_OPTIONS = ["business", "household"] as const;
const JOB_SORT_OPTIONS = ["newest", "salary_high", "salary_low"] as const;

const formatBirr = (cents: string) => `${(Number(cents) / CENTS_PER_BIRR).toLocaleString()} ETB`;
const toCents = (value: string) => (value ? Number(value) * CENTS_PER_BIRR : undefined);
const toBirrInput = (value: number | undefined) => (value === undefined ? "" : String(value / CENTS_PER_BIRR));

const CustomerJobsPage = React.memo(() => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");
	const isWorker = role === "worker";
	const [filter, setFilter] = React.useState<JobFilter>({ page: 1, limit: JOB_PAGE_LIMIT, sort: "newest" });
	const { data, isLoading } = useJobs(filter, { enabled: !isWorker });
	const { data: roles } = usePublicRoles();
	const { data: localities } = usePublicLocations({ kind: "locality" });
	const closeJob = useCloseJob();
	const roleCategories = React.useMemo(
		() => Array.from(new Set((roles ?? []).map((role) => role.category).filter(Boolean))).sort(),
		[roles],
	);

	React.useEffect(() => {
		if (isWorker) navigate({ to: "/app/requests", replace: true });
	}, [isWorker, navigate]);

	const onSearchChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			setFilter((current) => ({ ...current, q: e.target.value || undefined, page: 1 })),
		[],
	);

	const onRoleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter((current) => ({ ...current, roleId: e.target.value || undefined, page: 1 })),
		[],
	);

	const onRoleCategoryChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter((current) => ({ ...current, roleCategory: e.target.value || undefined, page: 1 })),
		[],
	);

	const onLocationChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter((current) => ({ ...current, location: e.target.value || undefined, page: 1 })),
		[],
	);

	const onStatusChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter((current) => ({
				...current,
				status: (e.target.value || undefined) as Job["status"] | undefined,
				page: 1,
			})),
		[],
	);

	const onEmployerTypeChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter((current) => ({
				...current,
				employerType: (e.target.value || undefined) as JobFilter["employerType"],
				page: 1,
			})),
		[],
	);

	const onSalaryMinChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			setFilter((current) => ({ ...current, salaryMinCents: toCents(e.target.value), page: 1 })),
		[],
	);

	const onSalaryMaxChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			setFilter((current) => ({ ...current, salaryMaxCents: toCents(e.target.value), page: 1 })),
		[],
	);

	const onPostedWithinChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter((current) => ({
				...current,
				postedWithinDays: e.target.value ? Number(e.target.value) : undefined,
				page: 1,
			})),
		[],
	);

	const onSortChange = React.useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			setFilter((current) => ({ ...current, sort: e.target.value as JobFilter["sort"], page: 1 })),
		[],
	);

	const onClose = React.useCallback((id: string) => closeJob.mutate(id), [closeJob]);

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{t("jobs.title")}</h1>
					<p className="text-sm text-muted-foreground">
						{isEmployer ? t("jobs.subtitle") : t("jobs.workerCatalogBody")}
					</p>
				</div>
				{isEmployer && (
					<Button asChild>
						<Link to="/app/jobs/new">{t("jobs.postJob")}</Link>
					</Button>
				)}
			</div>

			<Card>
				<CardContent className="grid gap-3 pt-6 md:grid-cols-4 xl:grid-cols-8">
					<div className="space-y-2">
						<Label htmlFor="q">{t("common.search")}</Label>
						<Input id="q" value={filter.q ?? ""} onChange={onSearchChange} placeholder={t("jobs.searchPlaceholder")} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="role">{t("workers.filterRole")}</Label>
						<select
							id="role"
							value={filter.roleId ?? ""}
							onChange={onRoleChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							{roles?.map((role) => (
								<option key={role.id} value={role.id}>
									{role.name}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="roleCategory">{t("jobs.roleCategory")}</Label>
						<select
							id="roleCategory"
							value={filter.roleCategory ?? ""}
							onChange={onRoleCategoryChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							{roleCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="location">{t("jobs.location")}</Label>
						<select
							id="location"
							value={filter.location ?? ""}
							onChange={onLocationChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							{localities?.map((locality) => (
								<option key={locality.id} value={locality.code}>
									{locality.nameEn}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="employerType">{t("jobs.employerType")}</Label>
						<select
							id="employerType"
							value={filter.employerType ?? ""}
							onChange={onEmployerTypeChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("common.any")}</option>
							{EMPLOYER_TYPE_OPTIONS.map((type) => (
								<option key={type} value={type}>
									{t(`jobs.employerType${type}`)}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="salaryMin">{t("jobs.salaryMin")}</Label>
						<Input
							id="salaryMin"
							type="number"
							min="0"
							value={toBirrInput(filter.salaryMinCents)}
							onChange={onSalaryMinChange}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="salaryMax">{t("jobs.salaryMax")}</Label>
						<Input
							id="salaryMax"
							type="number"
							min="0"
							value={toBirrInput(filter.salaryMaxCents)}
							onChange={onSalaryMaxChange}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="postedWithin">{t("jobs.postedWithin")}</Label>
						<select
							id="postedWithin"
							value={filter.postedWithinDays ?? ""}
							onChange={onPostedWithinChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">{t("jobs.postedAny")}</option>
							{POSTED_WITHIN_OPTIONS.map((days) => (
								<option key={days} value={days}>
									{t(`jobs.posted${days}`)}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="sort">{t("jobs.sort")}</Label>
						<select
							id="sort"
							value={filter.sort ?? "newest"}
							onChange={onSortChange}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							{JOB_SORT_OPTIONS.map((sort) => (
								<option key={sort} value={sort}>
									{t(`jobs.sort${sort}`)}
								</option>
							))}
						</select>
					</div>
					{isEmployer && (
						<div className="space-y-2">
							<Label htmlFor="status">{t("jobs.status")}</Label>
							<select
								id="status"
								value={filter.status ?? ""}
								onChange={onStatusChange}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">{t("common.any")}</option>
								<option value="open">{t("jobs.statusOpen")}</option>
								<option value="closed">{t("jobs.statusClosed")}</option>
								<option value="filled">{t("jobs.statusFilled")}</option>
							</select>
						</div>
					)}
					<div className="flex items-end text-sm text-muted-foreground">
						{isLoading ? t("common.loading") : t("jobs.count", { count: data?.meta.total ?? 0 })}
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-3">
				{data?.data.map((job) => (
					<Card key={job.id}>
						<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
							<div className="min-w-0">
								<CardTitle className="text-base">{job.title}</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									{job.roleName ?? job.roleId} - {job.location} - {formatBirr(job.salaryMinCents)} to{" "}
									{formatBirr(job.salaryMaxCents)}
								</p>
							</div>
							<Badge variant={JOB_STATUS_VARIANT[job.status]}>{t(`jobs.${job.status}`)}</Badge>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-sm text-muted-foreground">{job.description}</p>
							<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
								<div className="space-y-1">
									<span>{t("jobs.posted", { date: new Date(job.postedAt).toLocaleDateString() })}</span>
									{job.schedule && <p>{t("jobs.scheduleValue", { value: job.schedule })}</p>}
									{job.requirements && <p>{t("jobs.requirementsValue", { value: job.requirements })}</p>}
									{job.perks && <p>{t("jobs.perksValue", { value: job.perks })}</p>}
								</div>
								{isEmployer && (
									<div className="flex gap-2">
										<Button variant="outline" size="sm" asChild>
											<Link to="/app/jobs/$id/edit" params={{ id: job.id }}>
												{t("jobs.edit")}
											</Link>
										</Button>
										{job.status === "open" && (
											<Button variant="outline" size="sm" onClick={() => onClose(job.id)} disabled={closeJob.isPending}>
												{t("jobs.close")}
											</Button>
										)}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				))}
				{data && data.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">{t("jobs.empty")}</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
});
CustomerJobsPage.displayName = "CustomerJobsPage";

export const Route = createFileRoute("/app/jobs/")({
	component: CustomerJobsPage,
});
