import { NoteEditIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type Placement,
	type PlacementFilter,
	useEndPlacement,
	usePlacements,
} from "#features/placements/api/placement.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_VARIANT: Record<Placement["status"], "default" | "secondary" | "outline" | "destructive"> = {
	active: "default",
	ended: "secondary",
	disputed: "destructive",
	cancelled: "outline",
};

const formatBirr = (cents: string) => `${(Number(cents) / 100).toLocaleString()} ETB`;

const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const commissionRule = (placement: Placement) => {
	if (!placement.role) return "-";
	return placement.role.commType === "percent"
		? `${placement.role.commValue}% of salary`
		: `${placement.role.commValue.toLocaleString()} ETB flat`;
};

const PlacementRow = React.memo(({ placement }: { readonly placement: Placement }) => {
	const { t } = useTranslation();
	const endPlacement = useEndPlacement();
	const [isEnding, setIsEnding] = React.useState(false);
	const [endReason, setEndReason] = React.useState("");
	const [ratingByEmployer, setRatingByEmployer] = React.useState("");
	const [ratingCommentByEmployer, setRatingCommentByEmployer] = React.useState("");
	const [ratingByWorker, setRatingByWorker] = React.useState("");
	const [ratingCommentByWorker, setRatingCommentByWorker] = React.useState("");
	const workerName = placement.worker?.fullName ?? `Worker ${placement.workerId.slice(0, 8)}`;
	const employerName = placement.employer?.name ?? `Employer ${placement.employerId.slice(0, 8)}`;
	const paymentLabel = `${placement.paymentMethod.toUpperCase()} ${placement.paymentReference}`;
	const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
	const canEnd = placement.status === "active";

	const onStartEnd = React.useCallback(() => setIsEnding(true), []);
	const onCancelEnd = React.useCallback(() => {
		setIsEnding(false);
		setEndReason("");
		setRatingByEmployer("");
		setRatingCommentByEmployer("");
		setRatingByWorker("");
		setRatingCommentByWorker("");
	}, []);
	const onEndReasonChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setEndReason(event.target.value);
	}, []);
	const onRatingByEmployerChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setRatingByEmployer(event.target.value);
	}, []);
	const onRatingCommentByEmployerChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setRatingCommentByEmployer(event.target.value);
	}, []);
	const onRatingByWorkerChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setRatingByWorker(event.target.value);
	}, []);
	const onRatingCommentByWorkerChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setRatingCommentByWorker(event.target.value);
	}, []);
	const onSubmitEnd = React.useCallback(() => {
		endPlacement.mutate(
			{
				id: placement.id,
				endDate: today,
				endedReason: endReason,
				ratingByEmployer: ratingByEmployer ? Number(ratingByEmployer) : undefined,
				ratingCommentByEmployer: ratingCommentByEmployer.trim() || undefined,
				ratingByWorker: ratingByWorker ? Number(ratingByWorker) : undefined,
				ratingCommentByWorker: ratingCommentByWorker.trim() || undefined,
			},
			{ onSuccess: onCancelEnd },
		);
	}, [
		endPlacement,
		endReason,
		onCancelEnd,
		placement.id,
		ratingByEmployer,
		ratingByWorker,
		ratingCommentByEmployer,
		ratingCommentByWorker,
		today,
	]);

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-base font-semibold tracking-tight">{workerName}</h2>
							<span className="text-muted-foreground">to</span>
							<h3 className="text-base font-semibold tracking-tight">{employerName}</h3>
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{placement.role?.name ?? placement.roleId} - {placement.station?.name ?? placement.stationId.slice(0, 8)}
							{placement.job ? ` - ${placement.job.title}` : ""}
						</p>
					</div>
					<Badge variant={STATUS_VARIANT[placement.status]} className="capitalize">
						{placement.status}
					</Badge>
				</div>

				<div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-md border bg-muted/30 p-3">
						<p className="text-xs text-muted-foreground">{t("placements.salary")}</p>
						<p className="mt-1 font-mono text-lg font-semibold">{formatBirr(placement.salaryCents)}</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("placements.roleRange")}:{" "}
							{placement.role
								? `${formatBirr(placement.role.salaryMinCents)} - ${formatBirr(placement.role.salaryMaxCents)}`
								: "-"}
						</p>
					</div>
					<div className="rounded-md border bg-muted/30 p-3">
						<p className="text-xs text-muted-foreground">{t("placements.commission")}</p>
						<p className="mt-1 font-mono text-lg font-semibold">{formatBirr(placement.commissionCents)}</p>
						<p className="mt-1 text-xs text-muted-foreground">{commissionRule(placement)}</p>
					</div>
					<div className="rounded-md border bg-muted/30 p-3">
						<p className="text-xs text-muted-foreground">{t("placements.payment")}</p>
						<p className="mt-1 truncate font-medium">{paymentLabel}</p>
						<p className="mt-1 text-xs text-muted-foreground">{formatDate(placement.paymentReceivedAt)}</p>
					</div>
					<div className="rounded-md border bg-muted/30 p-3">
						<p className="text-xs text-muted-foreground">{t("placements.startDate")}</p>
						<p className="mt-1 font-medium">{new Date(placement.startDate).toLocaleDateString()}</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("placements.finalizedBy")}:{" "}
							{placement.finalizedByAgent?.name ?? placement.finalizedByAgent?.email ?? "-"}
						</p>
					</div>
				</div>

				<div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
					<p>
						{t("workers.phone")}: {placement.worker?.phone ?? "-"}
					</p>
					<p>
						{t("employers.phone")}: {placement.employer?.phone ?? "-"}
					</p>
					<p>
						{t("placements.created")}: {formatDate(placement.createdAt)}
					</p>
					{placement.agreementPdfUrl ? (
						<a
							href={placement.agreementPdfUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2 rounded-md border border-primary/30 px-3 py-2 font-medium text-primary hover:bg-primary/5"
						>
							<HugeiconsIcon icon={NoteEditIcon} className="size-4" />
							{t("placements.printAgreement")}
						</a>
					) : (
						<p>{t("placements.agreementPending")}</p>
					)}
				</div>
				{placement.status === "ended" && (
					<div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
						<p className="font-medium">{t("placements.ended")}</p>
						<p className="mt-1 text-muted-foreground">
							{placement.endDate ? new Date(placement.endDate).toLocaleDateString() : "-"} -{" "}
							{placement.endedReason ?? "-"}
						</p>
						{placement.ratingWindowClosesAt && (
							<p className="mt-1 text-xs text-muted-foreground">
								{t("placements.ratingWindowClosesAt")}: {formatDate(placement.ratingWindowClosesAt)}
							</p>
						)}
						{(placement.ratingCommentByEmployer || placement.ratingCommentByWorker) && (
							<div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
								{placement.ratingCommentByEmployer && (
									<p>
										<span className="font-medium text-foreground">{t("placements.workerRatingComment")}:</span>{" "}
										{placement.ratingCommentByEmployer}
									</p>
								)}
								{placement.ratingCommentByWorker && (
									<p>
										<span className="font-medium text-foreground">{t("placements.employerRatingComment")}:</span>{" "}
										{placement.ratingCommentByWorker}
									</p>
								)}
							</div>
						)}
					</div>
				)}
				{canEnd && !isEnding && (
					<div className="mt-4 flex justify-end">
						<Button variant="outline" size="sm" onClick={onStartEnd}>
							{t("placements.endPlacement")}
						</Button>
					</div>
				)}
				{isEnding && (
					<div className="mt-4 rounded-md border bg-muted/20 p-3">
						<div className="grid gap-3 md:grid-cols-[1fr_120px_120px]">
							<div>
								<label className="text-xs font-medium text-muted-foreground" htmlFor={`end-reason-${placement.id}`}>
									{t("placements.endReason")}
								</label>
								<Input
									id={`end-reason-${placement.id}`}
									value={endReason}
									onChange={onEndReasonChange}
									placeholder={t("placements.endReasonPlaceholder")}
								/>
							</div>
							<div>
								<label
									className="text-xs font-medium text-muted-foreground"
									htmlFor={`rating-employer-${placement.id}`}
								>
									{t("placements.workerRating")}
								</label>
								<Input
									id={`rating-employer-${placement.id}`}
									type="number"
									min={1}
									max={5}
									value={ratingByEmployer}
									onChange={onRatingByEmployerChange}
								/>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground" htmlFor={`rating-worker-${placement.id}`}>
									{t("placements.employerRating")}
								</label>
								<Input
									id={`rating-worker-${placement.id}`}
									type="number"
									min={1}
									max={5}
									value={ratingByWorker}
									onChange={onRatingByWorkerChange}
								/>
							</div>
						</div>
						<div className="mt-3 grid gap-3 md:grid-cols-2">
							<div>
								<label
									className="text-xs font-medium text-muted-foreground"
									htmlFor={`rating-employer-comment-${placement.id}`}
								>
									{t("placements.workerRatingComment")}
								</label>
								<textarea
									id={`rating-employer-comment-${placement.id}`}
									value={ratingCommentByEmployer}
									onChange={onRatingCommentByEmployerChange}
									maxLength={500}
									className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label
									className="text-xs font-medium text-muted-foreground"
									htmlFor={`rating-worker-comment-${placement.id}`}
								>
									{t("placements.employerRatingComment")}
								</label>
								<textarea
									id={`rating-worker-comment-${placement.id}`}
									value={ratingCommentByWorker}
									onChange={onRatingCommentByWorkerChange}
									maxLength={500}
									className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>
						</div>
						{endPlacement.error && <p className="mt-2 text-sm text-destructive">{endPlacement.error.message}</p>}
						<div className="mt-3 flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={onCancelEnd}>
								{t("common.cancel")}
							</Button>
							<Button size="sm" onClick={onSubmitEnd} disabled={!endReason.trim() || endPlacement.isPending}>
								{t("placements.confirmEnd")}
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
});
PlacementRow.displayName = "PlacementRow";

const PlacementsPage = React.memo(() => {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<PlacementFilter>({ page: 1, limit: 20 });
	const { data, isLoading } = usePlacements(filter);

	const onStatusChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter({
			page: 1,
			limit: 20,
			status: (event.target.value || undefined) as Placement["status"] | undefined,
		});
	}, []);

	return (
		<div className="max-w-6xl space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{t("placements.title")}</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{t("placements.subtitle", { count: data?.meta.total ?? 0 })}
					</p>
				</div>
				<select
					value={filter.status ?? ""}
					onChange={onStatusChange}
					className="rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					<option value="">{t("common.any")}</option>
					<option value="active">{t("placements.statusActive")}</option>
					<option value="ended">{t("placements.statusEnded")}</option>
					<option value="disputed">{t("placements.statusDisputed")}</option>
					<option value="cancelled">{t("placements.statusCancelled")}</option>
				</select>
			</div>

			{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
			<div className="space-y-3">
				{data?.data.map((placement) => (
					<PlacementRow key={placement.id} placement={placement} />
				))}
				{data && data.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">
							{t("placements.empty")}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
});
PlacementsPage.displayName = "PlacementsPage";

export const Route = createFileRoute("/staff/placements")({
	component: PlacementsPage,
});
