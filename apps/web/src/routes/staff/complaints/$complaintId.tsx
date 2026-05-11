import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { StaffComplaintDetailView } from "#features/complaints/components/StaffComplaintDetailView";

const ComplaintDetailRoute = React.memo(() => {
	const { complaintId } = Route.useParams();
	return <StaffComplaintDetailView complaintId={complaintId} />;
});
ComplaintDetailRoute.displayName = "ComplaintDetailRoute";

export const Route = createFileRoute("/staff/complaints/$complaintId")({
	component: ComplaintDetailRoute,
});
