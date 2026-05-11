import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { StaffTicketDetailView } from "#features/tickets/components/StaffTicketDetailView";

const TicketDetailRoute = React.memo(() => {
	const { ticketId } = Route.useParams();
	return <StaffTicketDetailView ticketId={ticketId} />;
});
TicketDetailRoute.displayName = "TicketDetailRoute";

export const Route = createFileRoute("/staff/tickets/$ticketId")({
	component: TicketDetailRoute,
});
