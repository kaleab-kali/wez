import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocations } from "#features/locations/api/location.queries";
import {
	SCOPE_TYPES,
	type ScopeType,
	STAFF_ROLES,
	type StaffRole,
	type StaffUser,
	useAssignStaffRole,
	useCreateStaffUser,
	useRevokeStaffRole,
	useStaffUsers,
} from "#features/staff-users/api/staff-user.queries";
import { useStations } from "#features/stations/api/station.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formatOption = (value: string) => value.replace(/_/g, " ");

const StaffCreateForm = React.memo(() => {
	const { t } = useTranslation();
	const create = useCreateStaffUser();
	const [name, setName] = React.useState("");
	const [email, setEmail] = React.useState("");
	const [primaryRole, setPrimaryRole] = React.useState<StaffRole>("support");
	const [temporaryPassword, setTemporaryPassword] = React.useState("");
	const [generatedPassword, setGeneratedPassword] = React.useState("");
	const [error, setError] = React.useState("");

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			setGeneratedPassword("");
			try {
				const result = await create.mutateAsync({
					name,
					email,
					primaryRole,
					temporaryPassword: temporaryPassword || undefined,
				});
				setGeneratedPassword(result.temporaryPassword);
				setName("");
				setEmail("");
				setTemporaryPassword("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[create, email, name, primaryRole, t, temporaryPassword],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("staffUsers.create")}</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
					{error && (
						<div className="rounded bg-destructive/10 p-2.5 text-sm text-destructive md:col-span-4">{error}</div>
					)}
					{generatedPassword && (
						<div className="rounded border bg-muted/40 p-3 text-sm md:col-span-4">
							<span className="font-medium">{t("staffUsers.temporaryPassword")}:</span>{" "}
							<span className="font-mono">{generatedPassword}</span>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="staff-name">{t("staffUsers.name")}</Label>
						<Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="staff-email">{t("auth.email")}</Label>
						<Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="staff-role">{t("staffUsers.primaryRole")}</Label>
						<select
							id="staff-role"
							value={primaryRole}
							onChange={(e) => setPrimaryRole(e.target.value as StaffRole)}
							className="h-10 w-full rounded-md border bg-background px-3 text-sm"
						>
							{STAFF_ROLES.map((role) => (
								<option key={role} value={role}>
									{formatOption(role)}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="staff-password">{t("staffUsers.passwordOptional")}</Label>
						<Input
							id="staff-password"
							type="password"
							value={temporaryPassword}
							onChange={(e) => setTemporaryPassword(e.target.value)}
						/>
					</div>
					<div className="flex justify-end md:col-span-4">
						<Button type="submit" disabled={create.isPending || !name || !email}>
							{create.isPending ? t("common.saving") : t("common.create")}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
});
StaffCreateForm.displayName = "StaffCreateForm";

const RoleAssignmentForm = React.memo(({ user }: { readonly user: StaffUser }) => {
	const { t } = useTranslation();
	const assign = useAssignStaffRole(user.id);
	const [role, setRole] = React.useState<StaffRole>("agent");
	const [scopeType, setScopeType] = React.useState<ScopeType>("station");
	const [scopeId, setScopeId] = React.useState("");
	const [error, setError] = React.useState("");
	const { data: locations } = useLocations({
		kind: scopeType === "station" || scopeType === "global" ? undefined : scopeType,
	});
	const { data: stations } = useStations();

	const scopeOptions = React.useMemo(() => {
		if (scopeType === "station") {
			return stations?.map((station) => ({ id: station.id, label: station.name })) ?? [];
		}
		if (scopeType === "global") return [];
		return locations?.map((location) => ({ id: location.id, label: location.nameEn })) ?? [];
	}, [locations, scopeType, stations]);

	const onScopeTypeChange = React.useCallback((value: ScopeType) => {
		setScopeType(value);
		setScopeId("");
	}, []);

	const onSubmit = React.useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			try {
				await assign.mutateAsync({ role, scopeType, scopeId: scopeType === "global" ? undefined : scopeId });
				setScopeId("");
			} catch (err) {
				setError(err instanceof Error ? err.message : t("common.error"));
			}
		},
		[assign, role, scopeId, scopeType, t],
	);

	const needsScope = scopeType !== "global";

	return (
		<form onSubmit={onSubmit} className="grid grid-cols-1 gap-2 md:grid-cols-4">
			{error && <div className="rounded bg-destructive/10 p-2 text-sm text-destructive md:col-span-4">{error}</div>}
			<select
				value={role}
				onChange={(e) => setRole(e.target.value as StaffRole)}
				className="h-9 rounded-md border bg-background px-2 text-sm"
			>
				{STAFF_ROLES.map((item) => (
					<option key={item} value={item}>
						{formatOption(item)}
					</option>
				))}
			</select>
			<select
				value={scopeType}
				onChange={(e) => onScopeTypeChange(e.target.value as ScopeType)}
				className="h-9 rounded-md border bg-background px-2 text-sm"
			>
				{SCOPE_TYPES.map((item) => (
					<option key={item} value={item}>
						{formatOption(item)}
					</option>
				))}
			</select>
			<select
				value={scopeId}
				onChange={(e) => setScopeId(e.target.value)}
				className="h-9 rounded-md border bg-background px-2 text-sm"
				disabled={!needsScope}
				required={needsScope}
			>
				<option value="">{needsScope ? t("common.select") : t("common.none")}</option>
				{scopeOptions.map((item) => (
					<option key={item.id} value={item.id}>
						{item.label}
					</option>
				))}
			</select>
			<Button type="submit" size="sm" disabled={assign.isPending || (needsScope && !scopeId)}>
				{assign.isPending ? t("common.saving") : t("staffUsers.assignRole")}
			</Button>
		</form>
	);
});
RoleAssignmentForm.displayName = "RoleAssignmentForm";

const StaffUserCard = React.memo(({ user }: { readonly user: StaffUser }) => {
	const { t } = useTranslation();
	const revoke = useRevokeStaffRole();
	const onRevoke = React.useCallback(
		(assignmentId: string) => {
			revoke.mutate({ assignmentId, reason: "Revoked from staff user admin" });
		},
		[revoke],
	);
	return (
		<Card>
			<CardHeader className="space-y-1">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<CardTitle className="text-base">{user.name}</CardTitle>
						<p className="text-sm text-muted-foreground">{user.email}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge variant="outline" className="capitalize">
							{formatOption(user.role)}
						</Badge>
						<Badge variant={user.active ? "default" : "secondary"}>
							{user.active ? t("common.yes") : t("common.no")}
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-2">
					<p className="text-xs font-medium uppercase text-muted-foreground">{t("staffUsers.roleAssignments")}</p>
					<div className="flex flex-wrap gap-2">
						{user.roleAssignments.length === 0 && (
							<span className="text-sm text-muted-foreground">{t("staffUsers.noAssignments")}</span>
						)}
						{user.roleAssignments.map((assignment) => (
							<div key={assignment.id} className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1">
								<span className="text-xs capitalize">
									{formatOption(assignment.role)} / {formatOption(assignment.scopeType)}
								</span>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									className="h-6 px-1.5 text-xs"
									disabled={revoke.isPending}
									onClick={() => onRevoke(assignment.id)}
								>
									{t("staffUsers.revoke")}
								</Button>
							</div>
						))}
					</div>
				</div>
				<RoleAssignmentForm user={user} />
			</CardContent>
		</Card>
	);
});
StaffUserCard.displayName = "StaffUserCard";

const StaffUsersPage = React.memo(() => {
	const { t } = useTranslation();
	const { data, isLoading } = useStaffUsers();

	return (
		<div className="max-w-5xl space-y-4">
			<div>
				<Link to="/staff-admin" className="text-sm text-muted-foreground transition hover:text-foreground">
					&larr; {t("admin.consoleTitle")}
				</Link>
				<h1 className="mt-2 text-2xl font-bold tracking-tight">{t("staffUsers.title")}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{t("staffUsers.subtitle")}</p>
			</div>
			<StaffCreateForm />
			<div className="space-y-3">
				{isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
				{data?.map((user) => (
					<StaffUserCard key={user.id} user={user} />
				))}
				{data && data.length === 0 && (
					<p className="py-6 text-center text-sm text-muted-foreground">{t("staffUsers.empty")}</p>
				)}
			</div>
		</div>
	);
});
StaffUsersPage.displayName = "StaffUsersPage";

export const Route = createFileRoute("/staff-admin/staff-users")({
	component: StaffUsersPage,
});
