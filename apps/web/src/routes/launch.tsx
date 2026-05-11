import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { adminAuthApi } from "#shared/lib/admin-auth-client";
import { authClient } from "#shared/lib/auth-client";
import { WezLogo } from "@/components/branding/WezLogo";
import { Skeleton } from "@/components/ui/skeleton";

const CUSTOMER_LAUNCH_ROUTE = "/app/dashboard";
const STAFF_LAUNCH_ROUTE = "/staff/dashboard";
const LOGIN_ROUTE = "/login";
const OFFLINE_ROUTE = "/offline";

const LaunchRoute = React.memo(() => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { data: customerSession, isPending: isCustomerPending } = authClient.useSession();
	const [hasAdminSession, setHasAdminSession] = React.useState<boolean | null>(null);
	const adminSessionRequestId = React.useRef(0);

	React.useEffect(() => {
		if (isCustomerPending || customerSession?.user || !navigator.onLine) {
			return;
		}

		const requestId = adminSessionRequestId.current + 1;
		adminSessionRequestId.current = requestId;
		setHasAdminSession(null);

		const checkAdminSession = async () => {
			const session = await adminAuthApi.me().catch(() => undefined);
			if (adminSessionRequestId.current === requestId) {
				setHasAdminSession(Boolean(session?.user));
			}
		};

		void checkAdminSession();
	}, [customerSession, isCustomerPending]);

	React.useEffect(() => {
		if (isCustomerPending) {
			return;
		}

		if (!navigator.onLine) {
			navigate({ to: OFFLINE_ROUTE, replace: true });
			return;
		}

		if (customerSession?.user) {
			navigate({ to: CUSTOMER_LAUNCH_ROUTE, replace: true });
			return;
		}

		if (hasAdminSession === null) {
			return;
		}

		if (hasAdminSession) {
			navigate({ to: STAFF_LAUNCH_ROUTE, replace: true });
			return;
		}

		navigate({ to: LOGIN_ROUTE, replace: true });
	}, [customerSession, hasAdminSession, isCustomerPending, navigate]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-6">
			<div className="w-full max-w-xs space-y-5 text-center">
				<WezLogo className="mx-auto h-12 w-28 text-primary" />
				<div className="space-y-2">
					<Skeleton className="mx-auto h-4 w-44" />
					<Skeleton className="mx-auto h-4 w-32" />
				</div>
				<p className="text-sm text-muted-foreground">{t("pwa.launching")}</p>
			</div>
		</div>
	);
});
LaunchRoute.displayName = "LaunchRoute";

export const Route = createFileRoute("/launch")({
	component: LaunchRoute,
});
