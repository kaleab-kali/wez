import { createFileRoute } from "@tanstack/react-router";
import { StaffComplaintsView } from "#features/complaints/components/StaffComplaintsView";

export const Route = createFileRoute("/staff/complaints/")({
	component: StaffComplaintsView,
});
