import { createFileRoute } from "@tanstack/react-router";
import { StaffTicketsView } from "#features/tickets/components/StaffTicketsView";

export const Route = createFileRoute("/staff/tickets/")({
	component: StaffTicketsView,
});
