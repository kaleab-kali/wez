import { createFileRoute, Navigate } from "@tanstack/react-router";
import React from "react";

const LoginPhoneRedirect = React.memo(() => <Navigate to="/login" search={{ as: "worker" }} replace />);
LoginPhoneRedirect.displayName = "LoginPhoneRedirect";

export const Route = createFileRoute("/login-phone")({
	component: LoginPhoneRedirect,
});
