import { NoteEditIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import {
	type Ticket,
	type TicketCategory,
	type TicketFilter,
	type TicketPriority,
	type TicketStatus,
	useCreateTicket,
	useTickets,
} from "#features/tickets/api/ticket.queries";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
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
const TICKET_TITLE_MIN_LENGTH = 5;
const TICKET_DESCRIPTION_MIN_LENGTH = 10;

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

export const StaffTicketsView = React.memo(() => {
	const [filter, setFilter] = React.useState<TicketFilter>({ page: 1, limit: 20 });
	const [createOpen, setCreateOpen] = React.useState(false);
	const { data, isLoading } = useTickets(filter);
	const columns = React.useMemo(() => ticketColumns(), []);
	const onStatusChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, status: (event.target.value || undefined) as TicketStatus, page: 1 }));
	}, []);
	const onCategoryChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, category: (event.target.value || undefined) as TicketCategory, page: 1 }));
	}, []);
	const onPriorityChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, priority: (event.target.value || undefined) as TicketPriority, page: 1 }));
	}, []);
	return (
		<div className="max-w-7xl space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Help & tickets</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{data?.meta.total ?? 0} internal tickets visible to your role.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={filter.status ?? ""}
						onChange={onStatusChange}
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="">Any category</option>
						{CATEGORIES.map((category) => (
							<option key={category} value={category}>
								{humanize(category)}
							</option>
						))}
					</select>
					<select
						value={filter.priority ?? ""}
						onChange={onPriorityChange}
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="">Any priority</option>
						{PRIORITIES.map((priority) => (
							<option key={priority} value={priority}>
								{priority}
							</option>
						))}
					</select>
					<TicketCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
				</div>
			</div>
			<DataTable
				columns={columns}
				data={data?.data ?? []}
				emptyMessage="No tickets match the current filters."
				isLoading={isLoading}
				pageSize={10}
				searchKey="title"
				searchPlaceholder="Search tickets..."
			/>
		</div>
	);
});
StaffTicketsView.displayName = "StaffTicketsView";

const ticketColumns = (): ColumnDef<Ticket>[] => [
	{
		id: "ticket",
		accessorFn: (row) => row.title,
		header: "Ticket",
		cell: ({ row }) => (
			<div className="min-w-64">
				<p className="font-medium">{row.original.title}</p>
				<p className="font-mono text-muted-foreground text-xs">{row.original.id.slice(0, 8)}</p>
			</div>
		),
	},
	{
		id: "category",
		accessorFn: (row) => row.category,
		header: "Category",
		cell: ({ row }) => humanize(row.original.category),
	},
	{
		id: "priority",
		accessorFn: (row) => row.priority,
		header: "Priority",
		cell: ({ row }) => (
			<Badge variant={row.original.priority === "urgent" ? "destructive" : "outline"}>{row.original.priority}</Badge>
		),
	},
	{
		id: "status",
		accessorFn: (row) => row.status,
		header: "Status",
		cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{humanize(row.original.status)}</Badge>,
	},
	{
		id: "raised-by",
		accessorFn: (row) => row.raisedByName ?? row.raisedById,
		header: "Raised by",
		cell: ({ row }) => row.original.raisedByName ?? row.original.raisedById.slice(0, 8),
	},
	{
		id: "assigned",
		accessorFn: (row) => row.assignedToName ?? "",
		header: "Assigned",
		cell: ({ row }) => row.original.assignedToName ?? "Unassigned",
	},
	{
		id: "opened",
		accessorFn: (row) => row.createdAt,
		header: "Opened",
		cell: ({ row }) => <span className="text-muted-foreground text-xs">{formatDate(row.original.createdAt)}</span>,
	},
	{
		id: "actions",
		header: "",
		cell: ({ row }) => (
			<Button type="button" variant="outline" size="sm" asChild>
				<Link to="/staff/tickets/$ticketId" params={{ ticketId: row.original.id }}>
					Review
				</Link>
			</Button>
		),
	},
];

type TicketCreateDialogProps = {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
};

const TicketCreateDialog = React.memo(({ open, onOpenChange }: TicketCreateDialogProps) => {
	const onCreated = React.useCallback(() => onOpenChange(false), [onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button type="button">
					<HugeiconsIcon icon={NoteEditIcon} className="mr-2 size-4" />
					Open ticket
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Open internal ticket</DialogTitle>
					<DialogDescription>
						Escalate a policy, system, finance, compliance, training, or HR issue to the responsible staff team.
					</DialogDescription>
				</DialogHeader>
				<TicketCreateForm onCreated={onCreated} />
			</DialogContent>
		</Dialog>
	);
});
TicketCreateDialog.displayName = "TicketCreateDialog";

const TicketCreateForm = React.memo(({ onCreated }: { readonly onCreated: () => void }) => {
	const createTicket = useCreateTicket();
	const [category, setCategory] = React.useState<TicketCategory>("policy_question");
	const [priority, setPriority] = React.useState<TicketPriority>("medium");
	const [title, setTitle] = React.useState("");
	const [description, setDescription] = React.useState("");
	const canSubmit =
		title.trim().length >= TICKET_TITLE_MIN_LENGTH && description.trim().length >= TICKET_DESCRIPTION_MIN_LENGTH;
	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			const trimmedTitle = title.trim();
			const trimmedDescription = description.trim();
			if (trimmedTitle.length < TICKET_TITLE_MIN_LENGTH || trimmedDescription.length < TICKET_DESCRIPTION_MIN_LENGTH)
				return;
			await createTicket.mutateAsync({ category, priority, title: trimmedTitle, description: trimmedDescription });
			setTitle("");
			setDescription("");
			onCreated();
		},
		[category, createTicket, description, onCreated, priority, title],
	);

	return (
		<form className="grid gap-3 lg:grid-cols-4" onSubmit={onSubmit}>
			<div className="space-y-2">
				<Label htmlFor="ticket-category">Category</Label>
				<select
					id="ticket-category"
					value={category}
					onChange={(event) => setCategory(event.target.value as TicketCategory)}
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
					onChange={(event) => setPriority(event.target.value as TicketPriority)}
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
					onChange={(event) => setTitle(event.target.value)}
					minLength={TICKET_TITLE_MIN_LENGTH}
					className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
					required
				/>
			</div>
			<div className="space-y-2 lg:col-span-4">
				<Label htmlFor="ticket-description">Description</Label>
				<textarea
					id="ticket-description"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
					minLength={TICKET_DESCRIPTION_MIN_LENGTH}
					className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					required
				/>
			</div>
			{createTicket.error && <p className="text-sm text-destructive lg:col-span-4">{createTicket.error.message}</p>}
			<div className="flex justify-end lg:col-span-4">
				<Button type="submit" disabled={!canSubmit || createTicket.isPending}>
					Open ticket
				</Button>
			</div>
		</form>
	);
});
TicketCreateForm.displayName = "TicketCreateForm";
