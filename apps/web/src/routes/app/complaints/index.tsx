import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type Complaint,
	type ComplaintSeverity,
	EMPLOYER_COMPLAINT_TYPES,
	useComplaints,
	useCreateComplaint,
	WORKER_COMPLAINT_TYPES,
} from "#features/complaints/api/complaint.queries";
import { type Placement, usePlacements } from "#features/placements/api/placement.queries";
import { DataTable } from "#shared/components/DataTable";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);
const SEVERITIES = ["low", "medium", "high"] as const satisfies readonly ComplaintSeverity[];
const MIN_DESCRIPTION_LENGTH = 10;

const formatBirr = (cents: string) => `${(Number(cents) / 100).toLocaleString()} ETB`;
const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));

const placementLabel = (placement: Placement, isWorker: boolean) => {
	const person = isWorker
		? (placement.employer?.name ?? placement.employerId.slice(0, 8))
		: (placement.worker?.fullName ?? placement.workerId.slice(0, 8));
	const role = placement.role?.name ?? placement.roleId;
	return `${person} - ${role} - ${formatBirr(placement.salaryCents)}`;
};

const CustomerComplaintsPage = React.memo(() => {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isWorker = role === "worker";
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");
	const filedByType = isWorker ? "worker" : "employer";
	const againstType = isWorker ? "employer" : "worker";
	const categoryOptions = isWorker ? WORKER_COMPLAINT_TYPES : EMPLOYER_COMPLAINT_TYPES;
	const { data: placements, isLoading: placementsLoading } = usePlacements({ page: 1, limit: 50 });
	const { data: complaints, isLoading: complaintsLoading } = useComplaints({ page: 1, limit: 50 });
	const createComplaint = useCreateComplaint();
	const [placementId, setPlacementId] = React.useState("");
	const [category, setCategory] = React.useState<string>(categoryOptions[0]);
	const [severity, setSeverity] = React.useState<ComplaintSeverity>("medium");
	const [description, setDescription] = React.useState("");
	const [error, setError] = React.useState("");
	const [success, setSuccess] = React.useState("");

	React.useEffect(() => {
		if ((categoryOptions as readonly string[]).includes(category)) return;
		setCategory(categoryOptions[0]);
	}, [category, categoryOptions]);

	const selectedPlacement = React.useMemo(
		() => placements?.data.find((placement) => placement.id === placementId),
		[placementId, placements],
	);

	const complaintColumns = React.useMemo<ColumnDef<Complaint>[]>(
		() => [
			{
				accessorKey: "createdAt",
				header: t("complaints.created"),
				cell: ({ row }) => formatDate(row.original.createdAt),
			},
			{
				accessorKey: "type",
				header: t("complaints.category"),
				cell: ({ row }) => t(`complaints.categories.${row.original.type}`),
			},
			{
				id: "party",
				header: t("complaints.against"),
				cell: ({ row }) => row.original.againstName ?? row.original.againstId.slice(0, 8),
			},
			{
				accessorKey: "severity",
				header: t("complaints.severity"),
				cell: ({ row }) => <Badge variant="outline">{t(`complaints.severities.${row.original.severity}`)}</Badge>,
			},
			{
				accessorKey: "status",
				header: t("complaints.status"),
				cell: ({ row }) => <Badge variant="secondary">{t(`complaints.statuses.${row.original.status}`)}</Badge>,
			},
		],
		[t],
	);

	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			setError("");
			setSuccess("");
			if (!isWorker && !isEmployer) {
				setError(t("complaints.customerOnly"));
				return;
			}
			if (!selectedPlacement) {
				setError(t("complaints.placementRequired"));
				return;
			}
			const trimmedDescription = description.trim();
			if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
				setError(t("complaints.descriptionRequired"));
				return;
			}
			try {
				await createComplaint.mutateAsync({
					filedByType,
					againstType,
					againstId: isWorker ? selectedPlacement.employerId : selectedPlacement.workerId,
					placementId: selectedPlacement.id,
					type: category,
					severity,
					description: trimmedDescription,
				});
				setDescription("");
				setPlacementId("");
				setSeverity("medium");
				setCategory(categoryOptions[0]);
				setSuccess(t("complaints.createdMessage"));
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[
			againstType,
			category,
			categoryOptions,
			createComplaint,
			description,
			filedByType,
			isEmployer,
			isWorker,
			selectedPlacement,
			severity,
			t,
		],
	);

	if (!isWorker && !isEmployer) {
		return (
			<Card>
				<CardContent className="py-10 text-center text-sm text-muted-foreground">
					{t("complaints.customerOnly")}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{t("complaints.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{isWorker ? t("complaints.workerSubtitle") : t("complaints.employerSubtitle")}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("complaints.fileComplaint")}</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="grid gap-4">
						{error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
						{success && <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">{success}</p>}
						<div className="grid gap-4 lg:grid-cols-3">
							<div className="space-y-2 lg:col-span-2">
								<Label htmlFor="complaint-placement">{t("complaints.placement")}</Label>
								<select
									id="complaint-placement"
									value={placementId}
									onChange={(event) => setPlacementId(event.target.value)}
									className="h-10 w-full rounded-md border bg-background px-3 text-sm"
									required
								>
									<option value="">{placementsLoading ? t("common.loading") : t("complaints.selectPlacement")}</option>
									{placements?.data.map((placement) => (
										<option key={placement.id} value={placement.id}>
											{placementLabel(placement, isWorker)}
										</option>
									))}
								</select>
								<p className="text-xs text-muted-foreground">{t("complaints.placementHelp")}</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="complaint-severity">{t("complaints.severity")}</Label>
								<select
									id="complaint-severity"
									value={severity}
									onChange={(event) => setSeverity(event.target.value as ComplaintSeverity)}
									className="h-10 w-full rounded-md border bg-background px-3 text-sm"
								>
									{SEVERITIES.map((item) => (
										<option key={item} value={item}>
											{t(`complaints.severities.${item}`)}
										</option>
									))}
								</select>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="complaint-category">{t("complaints.category")}</Label>
							<select
								id="complaint-category"
								value={category}
								onChange={(event) => setCategory(event.target.value)}
								className="h-10 w-full rounded-md border bg-background px-3 text-sm"
							>
								{categoryOptions.map((item) => (
									<option key={item} value={item}>
										{t(`complaints.categories.${item}`)}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="complaint-description">{t("complaints.description")}</Label>
							<textarea
								id="complaint-description"
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm"
								placeholder={t("complaints.descriptionPlaceholder")}
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={createComplaint.isPending || !selectedPlacement}>
								{createComplaint.isPending ? t("common.saving") : t("complaints.submit")}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("complaints.history")}</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={complaintColumns}
						data={complaints?.data ?? []}
						isLoading={complaintsLoading}
						searchKey="type"
						searchPlaceholder={t("complaints.search")}
						emptyMessage={t("complaints.empty")}
					/>
				</CardContent>
			</Card>
		</div>
	);
});
CustomerComplaintsPage.displayName = "CustomerComplaintsPage";

export const Route = createFileRoute("/app/complaints/")({
	component: CustomerComplaintsPage,
});
