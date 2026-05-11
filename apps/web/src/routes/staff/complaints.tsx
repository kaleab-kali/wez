import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import {
	type Complaint,
	type ComplaintFilter,
	type ComplaintResolutionTag,
	type ComplaintSeverity,
	type ComplaintStatus,
	complaintReferralLetterUrl,
	useCloseComplaint,
	useComplaints,
	useCreateComplaint,
	useMediateComplaint,
	useReferComplaintExternal,
} from "#features/complaints/api/complaint.queries";
import { usePlacements } from "#features/placements/api/placement.queries";
import { usePublicStations } from "#features/stations/api/station.queries";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES } from "#shared/lib/staff-roles";
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
const COMPLAINT_INTAKE_MODES = [
	{
		value: "worker_to_employer",
		title: "Worker complaint",
		direction: "Worker reports employer",
		filedByType: "worker",
		againstType: "employer",
		filedByLabel: "Worker filing",
		againstLabel: "Employer named",
		categories: WORKER_COMPLAINT_TYPES,
		statementLabel: "Worker statement",
		submitLabel: "Create worker complaint",
	},
	{
		value: "employer_to_worker",
		title: "Employer complaint",
		direction: "Employer reports worker",
		filedByType: "employer",
		againstType: "worker",
		filedByLabel: "Employer filing",
		againstLabel: "Worker named",
		categories: EMPLOYER_COMPLAINT_TYPES,
		statementLabel: "Employer statement",
		submitLabel: "Create employer complaint",
	},
] as const;
type ComplaintIntakeMode = (typeof COMPLAINT_INTAKE_MODES)[number]["value"];
const COMPLAINT_INTAKE_MODE_BY_VALUE = {
	worker_to_employer: COMPLAINT_INTAKE_MODES[0],
	employer_to_worker: COMPLAINT_INTAKE_MODES[1],
} as const satisfies Record<ComplaintIntakeMode, (typeof COMPLAINT_INTAKE_MODES)[number]>;
const SEVERITIES = ["low", "medium", "high"] as const;
const STATUSES = ["open", "mediating", "referred_external", "closed"] as const;
const RESOLUTION_TAGS = ["amicable", "partial", "failed"] as const;
const COMPLAINT_DESCRIPTION_MIN_LENGTH = 10;

type ComplaintActionPermissions = {
	readonly canCreate: boolean;
	readonly canMediate: boolean;
	readonly canReferExternal: boolean;
	readonly canClose: boolean;
	readonly canPrintReferralLetter: boolean;
};

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
	const { data: session } = useAdminSession();
	const userRoles = React.useMemo(
		() => effectiveStaffRoles(session?.user?.role, session?.user?.roles),
		[session?.user?.role, session?.user?.roles],
	);
	const permissions = React.useMemo<ComplaintActionPermissions>(
		() => ({
			canCreate: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintIntake),
			canMediate: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintMediation),
			canReferExternal: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintExternalReferral),
			canClose: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintClosure),
			canPrintReferralLetter: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintReferralLetter),
		}),
		[userRoles],
	);
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

			{permissions.canCreate && <ComplaintIntakeForm />}

			{isLoading && <p className="text-sm text-muted-foreground">Loading complaints...</p>}
			<div className="space-y-3">
				{data?.data.map((complaint) => (
					<ComplaintRow key={complaint.id} complaint={complaint} permissions={permissions} />
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

type ComplaintModeButtonProps = {
	readonly item: (typeof COMPLAINT_INTAKE_MODES)[number];
	readonly selected: boolean;
	readonly onSelect: (mode: ComplaintIntakeMode) => void;
};

const ComplaintModeButton = React.memo(({ item, selected, onSelect }: ComplaintModeButtonProps) => {
	const onClick = React.useCallback(() => {
		onSelect(item.value);
	}, [item.value, onSelect]);

	return (
		<Button
			aria-pressed={selected}
			className="h-auto justify-start gap-3 px-3 py-3 text-left"
			onClick={onClick}
			type="button"
			variant={selected ? "default" : "outline"}
		>
			<span className="min-w-0">
				<span className="block font-medium">{item.title}</span>
				<span className={selected ? "block text-primary-foreground/80 text-xs" : "block text-muted-foreground text-xs"}>
					{item.direction}
				</span>
			</span>
		</Button>
	);
});
ComplaintModeButton.displayName = "ComplaintModeButton";

const ComplaintIntakeForm = React.memo(() => {
	const { data: placements } = usePlacements({ page: 1, limit: 100 });
	const { data: stations } = usePublicStations();
	const createComplaint = useCreateComplaint();
	const [mode, setMode] = React.useState<ComplaintIntakeMode>("worker_to_employer");
	const [placementId, setPlacementId] = React.useState("");
	const [stationId, setStationId] = React.useState("");
	const [type, setType] = React.useState<string>(WORKER_COMPLAINT_TYPES[0]);
	const [severity, setSeverity] = React.useState<ComplaintSeverity>("medium");
	const [description, setDescription] = React.useState("");
	const [message, setMessage] = React.useState("");
	const modeConfig = COMPLAINT_INTAKE_MODE_BY_VALUE[mode];
	const filedByType = modeConfig.filedByType;
	const againstType = modeConfig.againstType;
	const selectedPlacement = React.useMemo(
		() => placements?.data.find((placement) => placement.id === placementId),
		[placementId, placements?.data],
	);
	const filedById = filedByType === "worker" ? selectedPlacement?.workerId : selectedPlacement?.employerId;
	const againstId = againstType === "worker" ? selectedPlacement?.workerId : selectedPlacement?.employerId;
	const workerDisplayName = selectedPlacement?.worker?.fullName ?? selectedPlacement?.workerId ?? "-";
	const employerDisplayName = selectedPlacement?.employer?.name ?? selectedPlacement?.employerId ?? "-";
	const filedByDisplayName = filedByType === "worker" ? workerDisplayName : employerDisplayName;
	const againstDisplayName = againstType === "worker" ? workerDisplayName : employerDisplayName;
	const canSubmit =
		Boolean(filedById && againstId && stationId) && description.trim().length >= COMPLAINT_DESCRIPTION_MIN_LENGTH;

	const onPlacementChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setPlacementId(event.target.value);
		setMessage("");
	}, []);
	const onStationChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setStationId(event.target.value);
		setMessage("");
	}, []);
	const onModeChange = React.useCallback((nextMode: ComplaintIntakeMode) => {
		const nextConfig = COMPLAINT_INTAKE_MODE_BY_VALUE[nextMode];
		setMode(nextMode);
		setType(nextConfig.categories[0]);
		setDescription("");
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
			const trimmedDescription = description.trim();
			if (!filedById || !againstId || !stationId || trimmedDescription.length < COMPLAINT_DESCRIPTION_MIN_LENGTH) {
				return;
			}
			const complaint = await createComplaint.mutateAsync({
				placementId,
				stationId,
				filedByType,
				filedById,
				againstType,
				againstId,
				type,
				severity,
				description: trimmedDescription,
			});
			setDescription("");
			setMessage(`${modeConfig.title} ${complaint.id.slice(0, 8)} created with status ${humanize(complaint.status)}.`);
		},
		[
			againstId,
			againstType,
			createComplaint,
			description,
			filedById,
			filedByType,
			modeConfig.title,
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
					<div className="space-y-2 lg:col-span-4">
						<Label>Complaint source</Label>
						<div className="grid gap-2 md:grid-cols-2">
							{COMPLAINT_INTAKE_MODES.map((item) => (
								<ComplaintModeButton
									item={item}
									key={item.value}
									onSelect={onModeChange}
									selected={item.value === mode}
								/>
							))}
						</div>
					</div>
					<div className="space-y-2 lg:col-span-2">
						<Label htmlFor="complaint-placement">Placement record</Label>
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
									Worker: {placement.worker?.fullName ?? placement.workerId.slice(0, 8)} | Employer:{" "}
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
					{selectedPlacement && (
						<div className="rounded-md border bg-muted/30 p-3 lg:col-span-4">
							<div className="grid gap-3 md:grid-cols-2">
								<div>
									<p className="text-muted-foreground text-xs">{modeConfig.filedByLabel}</p>
									<p className="font-medium text-sm">{filedByDisplayName}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">{modeConfig.againstLabel}</p>
									<p className="font-medium text-sm">{againstDisplayName}</p>
								</div>
							</div>
						</div>
					)}
					<div className="space-y-2 lg:col-span-2">
						<Label htmlFor="complaint-type">Category</Label>
						<select
							id="complaint-type"
							value={type}
							onChange={onTypeChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							{modeConfig.categories.map((item) => (
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
						<Label htmlFor="complaint-description">{modeConfig.statementLabel}</Label>
						<textarea
							id="complaint-description"
							value={description}
							onChange={onDescriptionChange}
							minLength={COMPLAINT_DESCRIPTION_MIN_LENGTH}
							className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							required
						/>
					</div>
					{message && <p className="text-sm text-primary lg:col-span-4">{message}</p>}
					{createComplaint.error && (
						<p className="text-sm text-destructive lg:col-span-4">{createComplaint.error.message}</p>
					)}
					<div className="lg:col-span-4">
						<Button type="submit" disabled={!canSubmit || createComplaint.isPending}>
							{modeConfig.submitLabel}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
});
ComplaintIntakeForm.displayName = "ComplaintIntakeForm";

const ComplaintRow = React.memo(
	({ complaint, permissions }: { readonly complaint: Complaint; readonly permissions: ComplaintActionPermissions }) => {
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
		const canWork =
			complaint.status !== "closed" && (permissions.canMediate || permissions.canReferExternal || permissions.canClose);
		const canShowResolution = permissions.canClose;
		const canShowExternalCase = permissions.canReferExternal;

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
					{complaint.status === "referred_external" && (
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-destructive/5 p-3 text-sm">
							<div>
								<p className="font-medium">External referral</p>
								<p className="text-muted-foreground">Case ID: {complaint.externalCaseId ?? "Not recorded yet"}</p>
							</div>
							{permissions.canPrintReferralLetter && (
								<Button asChild type="button" variant="outline">
									<a href={complaintReferralLetterUrl(complaint.id)} target="_blank" rel="noreferrer">
										Print referral letter
									</a>
								</Button>
							)}
						</div>
					)}
					{canWork && (
						<div className="grid gap-3 border-t pt-3 lg:grid-cols-[1fr_160px_160px]">
							{canShowResolution && (
								<div className="space-y-2">
									<Label htmlFor={`resolution-${complaint.id}`}>Resolution notes</Label>
									<textarea
										id={`resolution-${complaint.id}`}
										value={resolution}
										onChange={onResolutionChange}
										className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									/>
								</div>
							)}
							{(canShowResolution || canShowExternalCase) && (
								<div className="space-y-2">
									{canShowResolution && (
										<>
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
										</>
									)}
									{canShowExternalCase && (
										<Input
											value={externalCaseId}
											onChange={onExternalCaseChange}
											placeholder="External case ID"
											className="mt-2"
										/>
									)}
								</div>
							)}
							<div className="flex flex-col justify-end gap-2">
								{complaint.status === "open" && permissions.canMediate && (
									<Button type="button" variant="outline" onClick={onMediate} disabled={mediate.isPending}>
										Mark mediating
									</Button>
								)}
								{permissions.canReferExternal && (
									<Button type="button" variant="outline" onClick={onReferExternal} disabled={referExternal.isPending}>
										Refer external
									</Button>
								)}
								{permissions.canClose && (
									<Button type="button" onClick={onClose} disabled={resolution.trim().length < 5 || close.isPending}>
										Close complaint
									</Button>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		);
	},
);
ComplaintRow.displayName = "ComplaintRow";

export const Route = createFileRoute("/staff/complaints")({
	component: ComplaintsPage,
});
