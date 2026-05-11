import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import {
	type Complaint,
	type ComplaintFilter,
	type ComplaintResolutionTag,
	type ComplaintSeverity,
	type ComplaintStatus,
	useCloseComplaint,
	useComplaints,
	useCreateComplaint,
	useMediateComplaint,
	useReferComplaintExternal,
} from "#features/complaints/api/complaint.queries";
import { usePlacements } from "#features/placements/api/placement.queries";
import { usePublicStations } from "#features/stations/api/station.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WORKER_COMPLAINT_TYPES = [
	"late_wages",
	"unpaid_wages",
	"mistreatment",
	"harassment",
	"unsafe_conditions",
	"excessive_hours",
	"other",
] as const;
const EMPLOYER_COMPLAINT_TYPES = [
	"absences",
	"theft",
	"misconduct",
	"quit_without_notice",
	"below_skill",
	"other",
] as const;
const SEVERITIES = ["low", "medium", "high"] as const;
const STATUSES = ["open", "mediating", "referred_external", "closed"] as const;
const RESOLUTION_TAGS = ["amicable", "partial", "failed"] as const;

const STATUS_VARIANT: Record<ComplaintStatus, "default" | "secondary" | "outline" | "destructive"> = {
	open: "default",
	mediating: "secondary",
	referred_external: "destructive",
	closed: "outline",
};

const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const humanize = (value: string) => value.replaceAll("_", " ");

const ComplaintsPage = React.memo(() => {
	const [filter, setFilter] = React.useState<ComplaintFilter>({ page: 1, limit: 20 });
	const { data, isLoading } = useComplaints(filter);
	const onStatusChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, status: (event.target.value || undefined) as ComplaintStatus, page: 1 }));
	}, []);
	const onSeverityChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, severity: (event.target.value || undefined) as ComplaintSeverity, page: 1 }));
	}, []);

	return (
		<div className="max-w-6xl space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Complaints</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{data?.meta.total ?? 0} complaint records requiring station or HQ follow-up.
					</p>
				</div>
				<div className="flex gap-2">
					<select
						value={filter.status ?? ""}
						onChange={onStatusChange}
						className="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Any status</option>
						{STATUSES.map((status) => (
							<option key={status} value={status}>
								{humanize(status)}
							</option>
						))}
					</select>
					<select
						value={filter.severity ?? ""}
						onChange={onSeverityChange}
						className="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Any severity</option>
						{SEVERITIES.map((severity) => (
							<option key={severity} value={severity}>
								{severity}
							</option>
						))}
					</select>
				</div>
			</div>

			<ComplaintIntakeForm />

			{isLoading && <p className="text-sm text-muted-foreground">Loading complaints...</p>}
			<div className="space-y-3">
				{data?.data.map((complaint) => (
					<ComplaintRow key={complaint.id} complaint={complaint} />
				))}
				{data && data.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">
							No complaints match the current filters.
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
});
ComplaintsPage.displayName = "ComplaintsPage";

const ComplaintIntakeForm = React.memo(() => {
	const { data: placements } = usePlacements({ page: 1, limit: 100 });
	const { data: stations } = usePublicStations();
	const createComplaint = useCreateComplaint();
	const [placementId, setPlacementId] = React.useState("");
	const [stationId, setStationId] = React.useState("");
	const [filedByType, setFiledByType] = React.useState<"worker" | "employer">("worker");
	const [type, setType] = React.useState<string>(WORKER_COMPLAINT_TYPES[0]);
	const [severity, setSeverity] = React.useState<ComplaintSeverity>("medium");
	const [description, setDescription] = React.useState("");
	const [message, setMessage] = React.useState("");
	const selectedPlacement = React.useMemo(
		() => placements?.data.find((placement) => placement.id === placementId),
		[placementId, placements?.data],
	);
	const complaintTypes = filedByType === "worker" ? WORKER_COMPLAINT_TYPES : EMPLOYER_COMPLAINT_TYPES;
	const againstType = filedByType === "worker" ? "employer" : "worker";
	const filedById = filedByType === "worker" ? selectedPlacement?.workerId : selectedPlacement?.employerId;
	const againstId = filedByType === "worker" ? selectedPlacement?.employerId : selectedPlacement?.workerId;

	const onPlacementChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setPlacementId(event.target.value);
		setMessage("");
	}, []);
	const onStationChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setStationId(event.target.value);
		setMessage("");
	}, []);
	const onFiledByTypeChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		const next = event.target.value as "worker" | "employer";
		setFiledByType(next);
		setType(next === "worker" ? WORKER_COMPLAINT_TYPES[0] : EMPLOYER_COMPLAINT_TYPES[0]);
		setMessage("");
	}, []);
	const onTypeChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setType(event.target.value);
		setMessage("");
	}, []);
	const onSeverityChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setSeverity(event.target.value as ComplaintSeverity);
		setMessage("");
	}, []);
	const onDescriptionChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setDescription(event.target.value);
		setMessage("");
	}, []);
	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			if (!filedById || !againstId) return;
			const complaint = await createComplaint.mutateAsync({
				placementId,
				stationId,
				filedByType,
				filedById,
				againstType,
				againstId,
				type,
				severity,
				description,
			});
			setDescription("");
			setMessage(`Complaint ${complaint.id.slice(0, 8)} created with status ${humanize(complaint.status)}.`);
		},
		[
			againstId,
			againstType,
			createComplaint,
			description,
			filedById,
			filedByType,
			placementId,
			severity,
			stationId,
			type,
		],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Complaint intake</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="grid gap-3 lg:grid-cols-4" onSubmit={onSubmit}>
					<div className="space-y-2 lg:col-span-2">
						<Label htmlFor="complaint-placement">Placement</Label>
						<select
							id="complaint-placement"
							value={placementId}
							onChange={onPlacementChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							required
						>
							<option value="">Select placement history</option>
							{placements?.data.map((placement) => (
								<option key={placement.id} value={placement.id}>
									{placement.worker?.fullName ?? placement.workerId.slice(0, 8)} to{" "}
									{placement.employer?.name ?? placement.employerId.slice(0, 8)}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="complaint-station">Taking station</Label>
						<select
							id="complaint-station"
							value={stationId}
							onChange={onStationChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							required
						>
							<option value="">Select station</option>
							{stations?.map((station) => (
								<option key={station.id} value={station.id}>
									{station.name}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="complaint-filed-by">Filed by</Label>
						<select
							id="complaint-filed-by"
							value={filedByType}
							onChange={onFiledByTypeChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							<option value="worker">Worker</option>
							<option value="employer">Employer</option>
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="complaint-type">Category</Label>
						<select
							id="complaint-type"
							value={type}
							onChange={onTypeChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							{complaintTypes.map((item) => (
								<option key={item} value={item}>
									{humanize(item)}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="complaint-severity">Severity</Label>
						<select
							id="complaint-severity"
							value={severity}
							onChange={onSeverityChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							{SEVERITIES.map((item) => (
								<option key={item} value={item}>
									{item}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2 lg:col-span-4">
						<Label htmlFor="complaint-description">Description</Label>
						<textarea
							id="complaint-description"
							value={description}
							onChange={onDescriptionChange}
							minLength={10}
							className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							required
						/>
					</div>
					{message && <p className="text-sm text-primary lg:col-span-4">{message}</p>}
					{createComplaint.error && (
						<p className="text-sm text-destructive lg:col-span-4">{createComplaint.error.message}</p>
					)}
					<div className="lg:col-span-4">
						<Button type="submit" disabled={!filedById || !againstId || createComplaint.isPending}>
							Create complaint
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
});
ComplaintIntakeForm.displayName = "ComplaintIntakeForm";

const ComplaintRow = React.memo(({ complaint }: { readonly complaint: Complaint }) => {
	const mediate = useMediateComplaint();
	const referExternal = useReferComplaintExternal();
	const close = useCloseComplaint();
	const [resolution, setResolution] = React.useState("");
	const [resolutionTag, setResolutionTag] = React.useState<ComplaintResolutionTag>("amicable");
	const [externalCaseId, setExternalCaseId] = React.useState("");
	const onResolutionChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setResolution(event.target.value);
	}, []);
	const onResolutionTagChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setResolutionTag(event.target.value as ComplaintResolutionTag);
	}, []);
	const onExternalCaseChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setExternalCaseId(event.target.value);
	}, []);
	const onMediate = React.useCallback(() => mediate.mutate(complaint.id), [complaint.id, mediate]);
	const onReferExternal = React.useCallback(
		() => referExternal.mutate({ id: complaint.id, externalCaseId: externalCaseId.trim() || undefined }),
		[complaint.id, externalCaseId, referExternal],
	);
	const onClose = React.useCallback(
		() => close.mutate({ id: complaint.id, resolution, resolutionTag }),
		[close, complaint.id, resolution, resolutionTag],
	);
	const canWork = complaint.status !== "closed";

	return (
		<Card>
			<CardContent className="space-y-3 p-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="font-semibold">
								{complaint.filedByName ?? complaint.filedById.slice(0, 8)} against{" "}
								{complaint.againstName ?? complaint.againstId.slice(0, 8)}
							</h2>
							<Badge variant={STATUS_VARIANT[complaint.status]}>{humanize(complaint.status)}</Badge>
							<Badge variant={complaint.severity === "high" ? "destructive" : "outline"}>{complaint.severity}</Badge>
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{humanize(complaint.type)} - {complaint.stationName ?? "No station"} - {formatDate(complaint.createdAt)}
						</p>
					</div>
					<p className="font-mono text-xs text-muted-foreground">{complaint.id.slice(0, 8)}</p>
				</div>
				<p className="text-sm">{complaint.description}</p>
				{complaint.resolution && (
					<div className="rounded-md border bg-muted/30 p-3 text-sm">
						<p className="font-medium">
							Resolution: {complaint.resolutionTag ? humanize(complaint.resolutionTag) : "-"}
						</p>
						<p className="mt-1 text-muted-foreground">{complaint.resolution}</p>
					</div>
				)}
				{canWork && (
					<div className="grid gap-3 border-t pt-3 lg:grid-cols-[1fr_160px_160px]">
						<div className="space-y-2">
							<Label htmlFor={`resolution-${complaint.id}`}>Resolution notes</Label>
							<textarea
								id={`resolution-${complaint.id}`}
								value={resolution}
								onChange={onResolutionChange}
								className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`tag-${complaint.id}`}>Outcome</Label>
							<select
								id={`tag-${complaint.id}`}
								value={resolutionTag}
								onChange={onResolutionTagChange}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							>
								{RESOLUTION_TAGS.map((tag) => (
									<option key={tag} value={tag}>
										{humanize(tag)}
									</option>
								))}
							</select>
							<Input
								value={externalCaseId}
								onChange={onExternalCaseChange}
								placeholder="External case ID"
								className="mt-2"
							/>
						</div>
						<div className="flex flex-col justify-end gap-2">
							{complaint.status === "open" && (
								<Button type="button" variant="outline" onClick={onMediate} disabled={mediate.isPending}>
									Mark mediating
								</Button>
							)}
							<Button type="button" variant="outline" onClick={onReferExternal} disabled={referExternal.isPending}>
								Refer external
							</Button>
							<Button type="button" onClick={onClose} disabled={resolution.trim().length < 5 || close.isPending}>
								Close complaint
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
});
ComplaintRow.displayName = "ComplaintRow";

export const Route = createFileRoute("/staff/complaints")({
	component: ComplaintsPage,
});
