import { Link } from "@tanstack/react-router";
import React from "react";
import {
	type Ticket,
	type TicketStatus,
	useAssignTicket,
	useCloseTicket,
	useResolveTicket,
	useTicket,
	useTicketAssignmentOptions,
} from "#features/tickets/api/ticket.queries";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES, STAFF_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const RESOLUTION_MIN_LENGTH = 5;

type TicketActionPermissions = {
	readonly canAssign: boolean;
	readonly canResolve: boolean;
	readonly canClose: boolean;
	readonly canCloseGlobally: boolean;
	readonly canCloseForSupervisedAgents: boolean;
};

const STATUS_VARIANT: Record<TicketStatus, "default" | "secondary" | "outline" | "destructive"> = {
	open: "default",
	in_progress: "secondary",
	escalated_higher: "destructive",
	resolved: "outline",
	closed: "outline",
};

const humanize = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const StaffTicketDetailView = React.memo(({ ticketId }: { readonly ticketId: string }) => {
	const { data: ticket, isLoading } = useTicket(ticketId);
	const { data: session } = useAdminSession();
	const userRoles = React.useMemo(
		() => effectiveStaffRoles(session?.user?.role, session?.user?.roles),
		[session?.user?.role, session?.user?.roles],
	);
	const permissions = React.useMemo<TicketActionPermissions>(
		() => ({
			canAssign: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.ticketAssignment),
			canResolve: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.ticketResolution),
			canClose: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.ticketClosure),
			canCloseGlobally: hasAnyStaffRole(userRoles, [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager]),
			canCloseForSupervisedAgents: hasAnyStaffRole(userRoles, [STAFF_ROLES.stationSupervisor]),
		}),
		[userRoles],
	);

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!ticket) return <p className="text-sm text-muted-foreground">Ticket not found.</p>;

	return <TicketDetailPage currentUserId={session?.user?.id} permissions={permissions} ticket={ticket} />;
});
StaffTicketDetailView.displayName = "StaffTicketDetailView";

const TicketDetailPage = React.memo(
	({
		ticket,
		currentUserId,
		permissions,
	}: {
		readonly ticket: Ticket;
		readonly currentUserId: string | undefined;
		readonly permissions: TicketActionPermissions;
	}) => {
		const assignTicket = useAssignTicket();
		const resolveTicket = useResolveTicket();
		const closeTicket = useCloseTicket();
		const canWork = ticket.status !== "resolved" && ticket.status !== "closed";
		const { data: assignmentOptions } = useTicketAssignmentOptions(permissions.canAssign && canWork);
		const [assignedToId, setAssignedToId] = React.useState(ticket.assignedToId ?? "");
		const [resolution, setResolution] = React.useState("");
		const canCloseResolved =
			permissions.canClose &&
			ticket.status === "resolved" &&
			(permissions.canCloseGlobally || permissions.canCloseForSupervisedAgents || ticket.raisedById === currentUserId);
		const onAssignedToChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
			setAssignedToId(event.target.value);
		}, []);
		const onResolutionChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
			setResolution(event.target.value);
		}, []);
		const onAssign = React.useCallback(() => {
			if (assignedToId) assignTicket.mutate({ id: ticket.id, assignedToId });
		}, [assignTicket, assignedToId, ticket.id]);
		const onResolve = React.useCallback(() => {
			resolveTicket.mutate({ id: ticket.id, resolution: resolution.trim() });
		}, [resolution, resolveTicket, ticket.id]);
		const onClose = React.useCallback(() => {
			closeTicket.mutate(ticket.id);
		}, [closeTicket, ticket.id]);

		return (
			<div className="max-w-6xl space-y-4">
				<Link to="/staff/tickets" className="text-sm text-muted-foreground transition hover:text-foreground">
					Back to tickets
				</Link>
				<section className="rounded-lg border bg-card p-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-primary">Internal ticket</p>
							<h1 className="mt-1 text-2xl font-semibold tracking-tight">{ticket.title}</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								{humanize(ticket.category)} - raised by {ticket.raisedByName ?? ticket.raisedById.slice(0, 8)} -{" "}
								{formatDate(ticket.createdAt)}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={STATUS_VARIANT[ticket.status]}>{humanize(ticket.status)}</Badge>
							<Badge variant={ticket.priority === "urgent" ? "destructive" : "outline"}>{ticket.priority}</Badge>
							<Badge variant="outline" className="font-mono">
								{ticket.id.slice(0, 8)}
							</Badge>
						</div>
					</div>
				</section>
				<section className="grid gap-3 md:grid-cols-3">
					<Fact label="Assigned" value={ticket.assignedToName ?? "Unassigned"} />
					<Fact label="Assignee role" value={ticket.assignedToRole ?? "-"} />
					<Fact label="Resolved by" value={ticket.resolvedByName ?? "-"} />
				</section>
				<section className="rounded-md border bg-background p-4">
					<h2 className="font-semibold text-base">Description</h2>
					<p className="mt-3 whitespace-pre-wrap text-sm leading-6">{ticket.description}</p>
				</section>
				{ticket.resolution && (
					<section className="rounded-md border bg-background p-4">
						<h2 className="font-semibold text-base">Resolution</h2>
						<p className="mt-3 whitespace-pre-wrap text-muted-foreground text-sm leading-6">{ticket.resolution}</p>
					</section>
				)}
				{(canWork || canCloseResolved) && (
					<TicketActions
						assignedToId={assignedToId}
						assignmentOptions={assignmentOptions ?? []}
						assignPending={assignTicket.isPending}
						canAssign={permissions.canAssign && canWork}
						canCloseResolved={canCloseResolved}
						canResolve={permissions.canResolve && canWork}
						closePending={closeTicket.isPending}
						onAssign={onAssign}
						onAssignedToChange={onAssignedToChange}
						onClose={onClose}
						onResolutionChange={onResolutionChange}
						onResolve={onResolve}
						resolution={resolution}
						resolvePending={resolveTicket.isPending}
					/>
				)}
			</div>
		);
	},
);
TicketDetailPage.displayName = "TicketDetailPage";

type TicketActionsProps = {
	readonly canAssign: boolean;
	readonly canResolve: boolean;
	readonly canCloseResolved: boolean;
	readonly assignedToId: string;
	readonly resolution: string;
	readonly assignmentOptions: ReadonlyArray<{ readonly id: string; readonly name: string; readonly role: string }>;
	readonly assignPending: boolean;
	readonly resolvePending: boolean;
	readonly closePending: boolean;
	readonly onAssignedToChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	readonly onResolutionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	readonly onAssign: () => void;
	readonly onResolve: () => void;
	readonly onClose: () => void;
};

const TicketActions = React.memo(
	({
		canAssign,
		canResolve,
		canCloseResolved,
		assignedToId,
		resolution,
		assignmentOptions,
		assignPending,
		resolvePending,
		closePending,
		onAssignedToChange,
		onResolutionChange,
		onAssign,
		onResolve,
		onClose,
	}: TicketActionsProps) => (
		<section className="rounded-md border bg-background p-4">
			<h2 className="font-semibold text-base">Actions</h2>
			<div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
				<div className="grid gap-3">
					{canAssign && (
						<div className="space-y-2">
							<Label htmlFor="assigned-to">Assigned staff</Label>
							<select
								id="assigned-to"
								value={assignedToId}
								onChange={onAssignedToChange}
								className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							>
								<option value="">Unassigned</option>
								{assignmentOptions.map((option) => (
									<option key={option.id} value={option.id}>
										{option.name} - {option.role}
									</option>
								))}
							</select>
						</div>
					)}
					{canResolve && (
						<div className="space-y-2">
							<Label htmlFor="ticket-resolution">Resolution</Label>
							<textarea
								id="ticket-resolution"
								value={resolution}
								onChange={onResolutionChange}
								className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
					)}
				</div>
				<div className="flex flex-col justify-end gap-2">
					{canAssign && (
						<Button type="button" variant="outline" onClick={onAssign} disabled={!assignedToId || assignPending}>
							Assign
						</Button>
					)}
					{canResolve && (
						<Button
							type="button"
							onClick={onResolve}
							disabled={resolution.trim().length < RESOLUTION_MIN_LENGTH || resolvePending}
						>
							Resolve ticket
						</Button>
					)}
					{canCloseResolved && (
						<Button type="button" variant="outline" onClick={onClose} disabled={closePending}>
							Close ticket
						</Button>
					)}
				</div>
			</div>
		</section>
	),
);
TicketActions.displayName = "TicketActions";

const Fact = React.memo(({ label, value }: { readonly label: string; readonly value: string }) => (
	<div className="rounded-md border bg-background p-4">
		<p className="text-muted-foreground text-xs">{label}</p>
		<p className="mt-1 text-sm font-medium">{value}</p>
	</div>
));
Fact.displayName = "Fact";
