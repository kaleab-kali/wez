import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import {
	type Complaint,
	type ComplaintFilter,
	type ComplaintSeverity,
	type ComplaintStatus,
	useComplaints,
} from "#features/complaints/api/complaint.queries";
import { ComplaintIntakeDialog } from "#features/complaints/components/ComplaintIntakeDialog";
import { DataTable } from "#shared/components/DataTable";
import { useAdminSession } from "#shared/lib/admin-auth-client";
import { effectiveStaffRoles, hasAnyStaffRole, STAFF_ACCESS_ROLES } from "#shared/lib/staff-roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SEVERITIES = ["low", "medium", "high"] as const;
const STATUSES = ["open", "mediating", "referred_external", "closed"] as const;

type ComplaintActionPermissions = {
	readonly canCreate: boolean;
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

export const StaffComplaintsView = React.memo(() => {
	const [filter, setFilter] = React.useState<ComplaintFilter>({ page: 1, limit: 20 });
	const [intakeOpen, setIntakeOpen] = React.useState(false);
	const { data, isLoading } = useComplaints(filter);
	const { data: session } = useAdminSession();
	const userRoles = React.useMemo(
		() => effectiveStaffRoles(session?.user?.role, session?.user?.roles),
		[session?.user?.role, session?.user?.roles],
	);
	const permissions = React.useMemo<ComplaintActionPermissions>(
		() => ({
			canCreate: hasAnyStaffRole(userRoles, STAFF_ACCESS_ROLES.complaintIntake),
		}),
		[userRoles],
	);
	const columns = React.useMemo(() => complaintColumns(), []);
	const onStatusChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, status: (event.target.value || undefined) as ComplaintStatus, page: 1 }));
	}, []);
	const onSeverityChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setFilter((current) => ({ ...current, severity: (event.target.value || undefined) as ComplaintSeverity, page: 1 }));
	}, []);

	return (
		<div className="max-w-7xl space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Complaints</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{data?.meta.total ?? 0} complaint records requiring station or HQ follow-up.
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
						value={filter.severity ?? ""}
						onChange={onSeverityChange}
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="">Any severity</option>
						{SEVERITIES.map((severity) => (
							<option key={severity} value={severity}>
								{severity}
							</option>
						))}
					</select>
					{permissions.canCreate && <ComplaintIntakeDialog open={intakeOpen} onOpenChange={setIntakeOpen} />}
				</div>
			</div>
			<DataTable
				columns={columns}
				data={data?.data ?? []}
				emptyMessage="No complaints match the current filters."
				isLoading={isLoading}
				pageSize={10}
				searchPlaceholder="Search complaints..."
			/>
		</div>
	);
});
StaffComplaintsView.displayName = "StaffComplaintsView";

const complaintColumns = (): ColumnDef<Complaint>[] => [
	{
		id: "case",
		accessorFn: (row) => row.id,
		header: "Case",
		cell: ({ row }) => (
			<div>
				<p className="font-mono text-xs">{row.original.id.slice(0, 8)}</p>
				<p className="text-muted-foreground text-xs">{formatDate(row.original.createdAt)}</p>
			</div>
		),
	},
	{
		id: "parties",
		accessorFn: (row) => `${partyName(row, "filed")} ${partyName(row, "against")}`,
		header: "Parties",
		cell: ({ row }) => (
			<div className="min-w-56">
				<p className="font-medium">{partyName(row.original, "filed")}</p>
				<p className="text-muted-foreground text-xs">against {partyName(row.original, "against")}</p>
			</div>
		),
	},
	{
		id: "category",
		accessorFn: (row) => row.type,
		header: "Category",
		cell: ({ row }) => humanize(row.original.type),
	},
	{
		id: "severity",
		accessorFn: (row) => row.severity,
		header: "Severity",
		cell: ({ row }) => (
			<Badge variant={row.original.severity === "high" ? "destructive" : "outline"}>{row.original.severity}</Badge>
		),
	},
	{
		id: "status",
		accessorFn: (row) => row.status,
		header: "Status",
		cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{humanize(row.original.status)}</Badge>,
	},
	{
		id: "station",
		accessorFn: (row) => row.stationName ?? "",
		header: "Station",
		cell: ({ row }) => row.original.stationName ?? "-",
	},
	{
		id: "actions",
		header: "",
		cell: ({ row }) => (
			<Button type="button" variant="outline" size="sm" asChild>
				<Link to="/staff/complaints/$complaintId" params={{ complaintId: row.original.id }}>
					Review
				</Link>
			</Button>
		),
	},
];
