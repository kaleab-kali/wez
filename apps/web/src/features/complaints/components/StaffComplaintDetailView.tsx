import { Link } from "@tanstack/react-router";
import React from "react";
import {
	type Complaint,
	type ComplaintResolutionTag,
	type ComplaintStatus,
	complaintReferralLetterUrl,
	useCloseComplaint,
	useComplaint,
	useMediateComplaint,
	useReferComplaintExternal,
} from "#features/complaints/api/complaint.queries";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const RESOLUTION_TAGS = ["amicable", "partial", "failed"] as const;
const RESOLUTION_MIN_LENGTH = 5;

type ComplaintActionPermissions = {
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

const humanize = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const partyName = (complaint: Complaint, type: "filed" | "against") =>
	type === "filed"
		? (complaint.filedByName ?? complaint.filedById.slice(0, 8))
		: (complaint.againstName ?? complaint.againstId.slice(0, 8));

export const StaffComplaintDetailView = React.memo(({ complaintId }: { readonly complaintId: string }) => {
	const { data: complaint, isLoading } = useComplaint(complaintId);
	const { data: session } = useAdminSession();
	const userRoles = React.useMemo(
		() => effectiveStaffRoles(session?.user?.role, session?.user?.roles),
		[session?.user?.role, session?.user?.roles],
	);
	const permissions = React.useMemo<ComplaintActionPermissions>(
		() => ({
			canMediate: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintMediation),
			canReferExternal: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintExternalReferral),
			canClose: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintClosure),
			canPrintReferralLetter: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintReferralLetter),
		}),
		[userRoles],
	);

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!complaint) return <p className="text-sm text-muted-foreground">Complaint not found.</p>;

	return <ComplaintDetailPage complaint={complaint} permissions={permissions} />;
});
StaffComplaintDetailView.displayName = "StaffComplaintDetailView";

const ComplaintDetailPage = React.memo(
	({ complaint, permissions }: { readonly complaint: Complaint; readonly permissions: ComplaintActionPermissions }) => {
		const mediate = useMediateComplaint();
		const referExternal = useReferComplaintExternal();
		const close = useCloseComplaint();
		const [resolution, setResolution] = React.useState("");
		const [resolutionTag, setResolutionTag] = React.useState<ComplaintResolutionTag>("amicable");
		const [externalCaseId, setExternalCaseId] = React.useState(complaint.externalCaseId ?? "");
		const canWork = complaint.status !== "closed";
		const canClose = canWork && permissions.canClose;
		const canReferExternal = canWork && permissions.canReferExternal;
		const onResolutionChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
			setResolution(event.target.value);
		}, []);
		const onResolutionTagChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
			setResolutionTag(event.target.value as ComplaintResolutionTag);
		}, []);
		const onExternalCaseIdChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
			setExternalCaseId(event.target.value);
		}, []);
		const onMediate = React.useCallback(() => {
			mediate.mutate(complaint.id);
		}, [complaint.id, mediate]);
		const onReferExternal = React.useCallback(() => {
			referExternal.mutate({ id: complaint.id, externalCaseId: externalCaseId.trim() || undefined });
		}, [complaint.id, externalCaseId, referExternal]);
		const onClose = React.useCallback(() => {
			close.mutate({ id: complaint.id, resolution: resolution.trim(), resolutionTag });
		}, [close, complaint.id, resolution, resolutionTag]);

		return (
			<div className="max-w-6xl space-y-4">
				<Link to="/staff/complaints" className="text-sm text-muted-foreground transition hover:text-foreground">
					Back to complaints
				</Link>
				<section className="rounded-lg border bg-card p-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-primary">Complaint case</p>
							<h1 className="mt-1 text-2xl font-semibold tracking-tight">
								{partyName(complaint, "filed")} against {partyName(complaint, "against")}
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								{humanize(complaint.type)} - {complaint.stationName ?? "No station"} - {formatDate(complaint.createdAt)}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={STATUS_VARIANT[complaint.status]}>{humanize(complaint.status)}</Badge>
							<Badge variant={complaint.severity === "high" ? "destructive" : "outline"}>{complaint.severity}</Badge>
							<Badge variant="outline" className="font-mono">
								{complaint.id.slice(0, 8)}
							</Badge>
						</div>
					</div>
				</section>
				<ComplaintFacts complaint={complaint} />
				<ComplaintStatement complaint={complaint} />
				{complaint.resolution && <ComplaintResolution complaint={complaint} />}
				{complaint.status === "referred_external" && permissions.canPrintReferralLetter && (
					<Button asChild type="button" variant="outline">
						<a href={complaintReferralLetterUrl(complaint.id)} target="_blank" rel="noreferrer">
							Print referral letter
						</a>
					</Button>
				)}
				{canWork && (
					<ComplaintActions
						canClose={canClose}
						canReferExternal={canReferExternal}
						closePending={close.isPending}
						externalCaseId={externalCaseId}
						mediatePending={mediate.isPending}
						onClose={onClose}
						onExternalCaseIdChange={onExternalCaseIdChange}
						onMediate={onMediate}
						onReferExternal={onReferExternal}
						onResolutionChange={onResolutionChange}
						onResolutionTagChange={onResolutionTagChange}
						referExternalPending={referExternal.isPending}
						resolution={resolution}
						resolutionTag={resolutionTag}
						showMediate={complaint.status === "open" && permissions.canMediate}
					/>
				)}
			</div>
		);
	},
);
ComplaintDetailPage.displayName = "ComplaintDetailPage";

const ComplaintStatement = React.memo(({ complaint }: { readonly complaint: Complaint }) => (
	<section className="rounded-md border bg-background p-4">
		<h2 className="font-semibold text-base">Statement</h2>
		<p className="mt-3 whitespace-pre-wrap text-sm leading-6">{complaint.description}</p>
	</section>
));
ComplaintStatement.displayName = "ComplaintStatement";

const ComplaintResolution = React.memo(({ complaint }: { readonly complaint: Complaint }) => (
	<section className="rounded-md border bg-background p-4">
		<h2 className="font-semibold text-base">
			Resolution: {complaint.resolutionTag ? humanize(complaint.resolutionTag) : "-"}
		</h2>
		<p className="mt-3 whitespace-pre-wrap text-muted-foreground text-sm leading-6">{complaint.resolution}</p>
	</section>
));
ComplaintResolution.displayName = "ComplaintResolution";

const ComplaintFacts = React.memo(({ complaint }: { readonly complaint: Complaint }) => (
	<section className="rounded-md border bg-background p-4 text-sm">
		<h2 className="font-semibold text-base">Case details</h2>
		<div className="mt-4 grid gap-3 md:grid-cols-3">
			<Fact label="Filed by" value={partyName(complaint, "filed")} />
			<Fact label="Against" value={partyName(complaint, "against")} />
			<Fact label="Station" value={complaint.stationName ?? "-"} />
			<Fact label="External case" value={complaint.externalCaseId ?? "-"} mono />
			<Fact label="Closed at" value={complaint.closedAt ? formatDate(complaint.closedAt) : "-"} />
			<Fact label="Closed by" value={complaint.closedByName ?? "-"} />
		</div>
	</section>
));
ComplaintFacts.displayName = "ComplaintFacts";

type ComplaintActionsProps = {
	readonly showMediate: boolean;
	readonly canReferExternal: boolean;
	readonly canClose: boolean;
	readonly externalCaseId: string;
	readonly resolution: string;
	readonly resolutionTag: ComplaintResolutionTag;
	readonly mediatePending: boolean;
	readonly referExternalPending: boolean;
	readonly closePending: boolean;
	readonly onMediate: () => void;
	readonly onReferExternal: () => void;
	readonly onClose: () => void;
	readonly onExternalCaseIdChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onResolutionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	readonly onResolutionTagChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

const ComplaintActions = React.memo(
	({
		showMediate,
		canReferExternal,
		canClose,
		externalCaseId,
		resolution,
		resolutionTag,
		mediatePending,
		referExternalPending,
		closePending,
		onMediate,
		onReferExternal,
		onClose,
		onExternalCaseIdChange,
		onResolutionChange,
		onResolutionTagChange,
	}: ComplaintActionsProps) => (
		<section className="rounded-md border bg-background p-4">
			<h2 className="font-semibold text-base">Actions</h2>
			<div className="mt-4 space-y-3">
				{showMediate && (
					<Button type="button" variant="outline" onClick={onMediate} disabled={mediatePending} className="w-full">
						Mark mediating
					</Button>
				)}
				{canReferExternal && (
					<div className="space-y-2">
						<Label htmlFor="external-case-id">External case ID</Label>
						<Input
							id="external-case-id"
							value={externalCaseId}
							onChange={onExternalCaseIdChange}
							placeholder="External case ID"
						/>
						<Button
							type="button"
							variant="outline"
							onClick={onReferExternal}
							disabled={referExternalPending}
							className="w-full"
						>
							Refer external
						</Button>
					</div>
				)}
				{canClose && (
					<div className="space-y-3 border-t pt-3">
						<div className="space-y-2">
							<Label htmlFor="resolution">Resolution notes</Label>
							<textarea
								id="resolution"
								value={resolution}
								onChange={onResolutionChange}
								className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
						<select
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
						<Button
							type="button"
							onClick={onClose}
							disabled={resolution.trim().length < RESOLUTION_MIN_LENGTH || closePending}
							className="w-full"
						>
							Close complaint
						</Button>
					</div>
				)}
			</div>
		</section>
	),
);
ComplaintActions.displayName = "ComplaintActions";

const Fact = React.memo(
	({ label, value, mono = false }: { readonly label: string; readonly value: string; readonly mono?: boolean }) => (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className={`mt-1 ${mono ? "font-mono" : ""}`}>{value}</p>
		</div>
	),
);
Fact.displayName = "Fact";
