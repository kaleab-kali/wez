import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import {
	type Ticket,
	type TicketCategory,
	type TicketFilter,
	type TicketPriority,
	type TicketStatus,
	useAssignTicket,
	useCloseTicket,
	useCreateTicket,
	useResolveTicket,
	useTicketAssignmentOptions,
	useTickets,
} from "#features/tickets/api/ticket.queries";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES, STAFF_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
	"system_issue",
	"policy_question",
	"compliance_concern",
	"finance_issue",
	"training_request",
	"hr_issue",
	"other",
] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["open", "in_progress", "escalated_higher", "resolved", "closed"] as const;

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

const TicketsPage = React.memo(() => {
	const [filter, setFilter] = React.useState<TicketFilter>({ page: 1, limit: 20 });
	const { data, isLoading } = useTickets(filter);
	const { data: session } = useAdminSession();
	const user = session?.user as { role?: string; roles?: string[] } | undefined;
	const userRoles = React.useMemo(() => effectiveStaffRoles(user?.role, user?.roles), [user?.role, user?.roles]);
	const canAssign = React.useMemo(() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.ticketAssignment), [userRoles]);
	const canResolve = React.useMemo(() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.ticketResolution), [userRoles]);
	const canClose = React.useMemo(() => hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.ticketClosure), [userRoles]);
	const canCloseGlobally = React.useMemo(
		() => hasAnyStaffRole(userRoles, [STAFF_ROLES.superAdmin, STAFF_ROLES.opsManager]),
		[userRoles],
	);
	const canCloseForSupervisedAgents = React.useMemo(
		() => hasAnyStaffRole(userRoles, [STAFF_ROLES.stationSupervisor]),
		[userRoles],
	);
	const onStatusChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, status: (event.target.value || undefined) as TicketStatus, page: 1 }));
	}, []);
	const onCategoryChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, category: (event.target.value || undefined) as TicketCategory, page: 1 }));
	}, []);

	return (
		<div className="max-w-6xl space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Help & tickets</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{data?.meta.total ?? 0} internal tickets visible to your role.
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
						value={filter.category ?? ""}
						onChange={onCategoryChange}
						className="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Any category</option>
						{CATEGORIES.map((category) => (
							<option key={category} value={category}>
								{humanize(category)}
							</option>
						))}
					</select>
				</div>
			</div>

			<TicketCreateForm />

			{isLoading && <p className="text-sm text-muted-foreground">Loading tickets...</p>}
			<div className="space-y-3">
				{data?.data.map((ticket) => (
					<TicketRow
						key={ticket.id}
						ticket={ticket}
						currentUserId={session?.user?.id}
						canAssign={canAssign}
						canResolve={canResolve}
						canClose={canClose}
						canCloseGlobally={canCloseGlobally}
						canCloseForSupervisedAgents={canCloseForSupervisedAgents}
					/>
				))}
				{data && data.data.length === 0 && (
					<Card className="border-dashed">
						<CardContent className="py-12 text-center text-sm text-muted-foreground">
							No tickets match the current filters.
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
});
TicketsPage.displayName = "TicketsPage";

const TicketCreateForm = React.memo(() => {
	const createTicket = useCreateTicket();
	const [category, setCategory] = React.useState<TicketCategory>("policy_question");
	const [priority, setPriority] = React.useState<TicketPriority>("medium");
	const [title, setTitle] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [message, setMessage] = React.useState("");
	const onCategoryChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setCategory(event.target.value as TicketCategory);
		setMessage("");
	}, []);
	const onPriorityChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setPriority(event.target.value as TicketPriority);
		setMessage("");
	}, []);
	const onTitleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setTitle(event.target.value);
		setMessage("");
	}, []);
	const onDescriptionChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setDescription(event.target.value);
		setMessage("");
	}, []);
	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			const ticket = await createTicket.mutateAsync({ category, priority, title, description });
			setTitle("");
			setDescription("");
			setMessage(`Ticket ${ticket.id.slice(0, 8)} opened and routed.`);
		},
		[category, createTicket, description, priority, title],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Open internal ticket</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="grid gap-3 lg:grid-cols-4" onSubmit={onSubmit}>
					<div className="space-y-2">
						<Label htmlFor="ticket-category">Category</Label>
						<select
							id="ticket-category"
							value={category}
							onChange={onCategoryChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							{CATEGORIES.map((item) => (
								<option key={item} value={item}>
									{humanize(item)}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="ticket-priority">Priority</Label>
						<select
							id="ticket-priority"
							value={priority}
							onChange={onPriorityChange}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
						>
							{PRIORITIES.map((item) => (
								<option key={item} value={item}>
									{item}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2 lg:col-span-2">
						<Label htmlFor="ticket-title">Title</Label>
						<input
							id="ticket-title"
							value={title}
							onChange={onTitleChange}
							minLength={5}
							className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
							required
						/>
					</div>
					<div className="space-y-2 lg:col-span-4">
						<Label htmlFor="ticket-description">Description</Label>
						<textarea
							id="ticket-description"
							value={description}
							onChange={onDescriptionChange}
							minLength={10}
							className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							required
						/>
					</div>
					{message && <p className="text-sm text-primary lg:col-span-4">{message}</p>}
					{createTicket.error && <p className="text-sm text-destructive lg:col-span-4">{createTicket.error.message}</p>}
					<div className="lg:col-span-4">
						<Button type="submit" disabled={createTicket.isPending}>
							Open ticket
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
});
TicketCreateForm.displayName = "TicketCreateForm";

const TicketRow = React.memo(
	({
		ticket,
		currentUserId,
		canAssign,
		canResolve,
		canClose,
		canCloseGlobally,
		canCloseForSupervisedAgents,
	}: {
		readonly ticket: Ticket;
		readonly currentUserId: string | undefined;
		readonly canAssign: boolean;
		readonly canResolve: boolean;
		readonly canClose: boolean;
		readonly canCloseGlobally: boolean;
		readonly canCloseForSupervisedAgents: boolean;
	}) => {
		const assignTicket = useAssignTicket();
		const resolveTicket = useResolveTicket();
		const closeTicket = useCloseTicket();
		const { data: assignmentOptions } = useTicketAssignmentOptions(canAssign);
		const [assignedToId, setAssignedToId] = React.useState(ticket.assignedToId ?? "");
		const [resolution, setResolution] = React.useState("");
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
			resolveTicket.mutate({ id: ticket.id, resolution });
		}, [resolution, resolveTicket, ticket.id]);
		const onClose = React.useCallback(() => {
			closeTicket.mutate(ticket.id);
		}, [closeTicket, ticket.id]);
		const canWork = ticket.status !== "resolved" && ticket.status !== "closed";
		const canCloseResolved =
			canClose &&
			ticket.status === "resolved" &&
			(canCloseGlobally || canCloseForSupervisedAgents || ticket.raisedById === currentUserId);

		return (
			<Card>
				<CardContent className="space-y-3 p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="font-semibold">{ticket.title}</h2>
								<Badge variant={STATUS_VARIANT[ticket.status]}>{humanize(ticket.status)}</Badge>
								<Badge variant={ticket.priority === "urgent" ? "destructive" : "outline"}>{ticket.priority}</Badge>
							</div>
							<p className="mt-1 text-xs text-muted-foreground">
								{humanize(ticket.category)} - raised by {ticket.raisedByName ?? ticket.raisedById.slice(0, 8)} -{" "}
								{formatDate(ticket.createdAt)}
							</p>
						</div>
						<p className="font-mono text-xs text-muted-foreground">{ticket.id.slice(0, 8)}</p>
					</div>
					<p className="text-sm">{ticket.description}</p>
					<div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm md:grid-cols-3">
						<p>
							<span className="text-muted-foreground">Assigned:</span> {ticket.assignedToName ?? "Unassigned"}
						</p>
						<p>
							<span className="text-muted-foreground">Assignee role:</span> {ticket.assignedToRole ?? "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Resolved by:</span> {ticket.resolvedByName ?? "-"}
						</p>
					</div>
					{ticket.resolution && (
						<div className="rounded-md border bg-muted/30 p-3 text-sm">
							<p className="font-medium">Resolution</p>
							<p className="mt-1 text-muted-foreground">{ticket.resolution}</p>
						</div>
					)}
					{canWork && (
						<div className="grid gap-3 border-t pt-3 lg:grid-cols-[240px_1fr_140px]">
							{canAssign && (
								<div className="space-y-2">
									<Label htmlFor={`assign-${ticket.id}`}>Assign to</Label>
									<select
										id={`assign-${ticket.id}`}
										value={assignedToId}
										onChange={onAssignedToChange}
										className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
									>
										<option value="">Unassigned</option>
										{assignmentOptions?.map((option) => (
											<option key={option.id} value={option.id}>
												{option.name} - {option.role}
											</option>
										))}
									</select>
									<Button type="button" variant="outline" onClick={onAssign} disabled={!assignedToId}>
										Assign
									</Button>
								</div>
							)}
							{canResolve && (
								<>
									<div className="space-y-2">
										<Label htmlFor={`resolve-${ticket.id}`}>Resolution</Label>
										<textarea
											id={`resolve-${ticket.id}`}
											value={resolution}
											onChange={onResolutionChange}
											className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										/>
									</div>
									<div className="flex items-end">
										<Button type="button" onClick={onResolve} disabled={resolution.trim().length < 5}>
											Resolve
										</Button>
									</div>
								</>
							)}
						</div>
					)}
					{canCloseResolved && (
						<div className="flex justify-end border-t pt-3">
							<Button type="button" variant="outline" onClick={onClose} disabled={closeTicket.isPending}>
								Close ticket
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		);
	},
);
TicketRow.displayName = "TicketRow";

export const Route = createFileRoute("/staff/tickets")({
	component: TicketsPage,
});
