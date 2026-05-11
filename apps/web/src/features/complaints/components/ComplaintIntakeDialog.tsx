import { NoteEditIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { type ComplaintSeverity, useCreateComplaint } from "#features/complaints/api/complaint.queries";
import { usePlacements } from "#features/placements/api/placement.queries";
import { usePublicStations } from "#features/stations/api/station.queries";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
const COMPLAINT_DESCRIPTION_MIN_LENGTH = 10;

const humanize = (value: string) => value.replaceAll("_", " ");

type ComplaintIntakeDialogProps = {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
};

export const ComplaintIntakeDialog = React.memo(({ open, onOpenChange }: ComplaintIntakeDialogProps) => {
	const onCreated = React.useCallback(() => onOpenChange(false), [onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button type="button">
					<HugeiconsIcon icon={NoteEditIcon} className="mr-2 size-4" />
					New complaint
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Complaint intake</DialogTitle>
					<DialogDescription>
						File a worker or employer complaint from an existing placement record and route it to the responsible
						station.
					</DialogDescription>
				</DialogHeader>
				<ComplaintIntakeForm onCreated={onCreated} />
			</DialogContent>
		</Dialog>
	);
});
ComplaintIntakeDialog.displayName = "ComplaintIntakeDialog";

const ComplaintIntakeForm = React.memo(({ onCreated }: { readonly onCreated: () => void }) => {
	const { data: placements } = usePlacements({ page: 1, limit: 100 });
	const { data: stations } = usePublicStations();
	const createComplaint = useCreateComplaint();
	const [mode, setMode] = React.useState<ComplaintIntakeMode>("worker_to_employer");
	const [placementId, setPlacementId] = React.useState("");
	const [stationId, setStationId] = React.useState("");
	const [type, setType] = React.useState<string>(WORKER_COMPLAINT_TYPES[0]);
	const [severity, setSeverity] = React.useState<ComplaintSeverity>("medium");
	const [description, setDescription] = React.useState("");
	const modeConfig = COMPLAINT_INTAKE_MODE_BY_VALUE[mode];
	const selectedPlacement = React.useMemo(
		() => placements?.data.find((placement) => placement.id === placementId),
		[placementId, placements?.data],
	);
	const filedById = modeConfig.filedByType === "worker" ? selectedPlacement?.workerId : selectedPlacement?.employerId;
	const againstId = modeConfig.againstType === "worker" ? selectedPlacement?.workerId : selectedPlacement?.employerId;
	const workerName = selectedPlacement?.worker?.fullName ?? selectedPlacement?.workerId ?? "-";
	const employerName = selectedPlacement?.employer?.name ?? selectedPlacement?.employerId ?? "-";
	const canSubmit =
		Boolean(filedById && againstId && stationId) && description.trim().length >= COMPLAINT_DESCRIPTION_MIN_LENGTH;
	const onModeChange = React.useCallback((nextMode: ComplaintIntakeMode) => {
		const nextConfig = COMPLAINT_INTAKE_MODE_BY_VALUE[nextMode];
		setMode(nextMode);
		setType(nextConfig.categories[0]);
		setDescription("");
	}, []);
	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			const trimmedDescription = description.trim();
			if (!filedById || !againstId || !stationId || trimmedDescription.length < COMPLAINT_DESCRIPTION_MIN_LENGTH) {
				return;
			}
			await createComplaint.mutateAsync({
				placementId,
				stationId,
				filedByType: modeConfig.filedByType,
				filedById,
				againstType: modeConfig.againstType,
				againstId,
				type,
				severity,
				description: trimmedDescription,
			});
			setDescription("");
			onCreated();
		},
		[againstId, createComplaint, description, filedById, modeConfig, onCreated, placementId, severity, stationId, type],
	);

	return (
		<form className="grid gap-3 lg:grid-cols-4" onSubmit={onSubmit}>
			<div className="space-y-2 lg:col-span-4">
				<Label>Complaint source</Label>
				<div className="grid gap-2 md:grid-cols-2">
					{COMPLAINT_INTAKE_MODES.map((item) => (
						<Button
							aria-pressed={item.value === mode}
							className="h-auto justify-start px-3 py-3 text-left"
							key={item.value}
							onClick={() => onModeChange(item.value)}
							type="button"
							variant={item.value === mode ? "default" : "outline"}
						>
							<span>
								<span className="block font-medium">{item.title}</span>
								<span
									className={
										item.value === mode
											? "block text-primary-foreground/80 text-xs"
											: "block text-muted-foreground text-xs"
									}
								>
									{item.direction}
								</span>
							</span>
						</Button>
					))}
				</div>
			</div>
			<div className="space-y-2 lg:col-span-2">
				<Label htmlFor="complaint-placement">Placement record</Label>
				<select
					id="complaint-placement"
					value={placementId}
					onChange={(event) => setPlacementId(event.target.value)}
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
					onChange={(event) => setStationId(event.target.value)}
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
						<p>
							<span className="block text-muted-foreground text-xs">{modeConfig.filedByLabel}</span>
							<span className="font-medium text-sm">
								{modeConfig.filedByType === "worker" ? workerName : employerName}
							</span>
						</p>
						<p>
							<span className="block text-muted-foreground text-xs">{modeConfig.againstLabel}</span>
							<span className="font-medium text-sm">
								{modeConfig.againstType === "worker" ? workerName : employerName}
							</span>
						</p>
					</div>
				</div>
			)}
			<div className="space-y-2 lg:col-span-2">
				<Label htmlFor="complaint-type">Category</Label>
				<select
					id="complaint-type"
					value={type}
					onChange={(event) => setType(event.target.value)}
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
					onChange={(event) => setSeverity(event.target.value as ComplaintSeverity)}
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
					onChange={(event) => setDescription(event.target.value)}
					minLength={COMPLAINT_DESCRIPTION_MIN_LENGTH}
					className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					required
				/>
			</div>
			{createComplaint.error && (
				<p className="text-sm text-destructive lg:col-span-4">{createComplaint.error.message}</p>
			)}
			<div className="flex justify-end lg:col-span-4">
				<Button type="submit" disabled={!canSubmit || createComplaint.isPending}>
					{modeConfig.submitLabel}
				</Button>
			</div>
		</form>
	);
});
ComplaintIntakeForm.displayName = "ComplaintIntakeForm";
