import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { AttachmentUploadField } from "#features/files/components/AttachmentUploadField";
import { useLookupKind } from "#features/lookups/api/lookup.queries";
import { useMyWorkerProfile, useUpdateMyWorkerProfile } from "#features/workers/api/worker.queries";
import { WorkerProfilePhoto } from "#features/workers/components/WorkerProfilePhoto";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const EMPLOYER_ROLES = new Set(["employer_business", "employer_household"]);

const WorkerProfilePage = React.memo(() => {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const isEmployer = EMPLOYER_ROLES.has(role ?? "");
	const { data: worker, isLoading } = useMyWorkerProfile();
	const { data: languages } = useLookupKind("languages");
	const updateProfile = useUpdateMyWorkerProfile();
	const [bio, setBio] = React.useState("");
	const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>([]);
	const [message, setMessage] = React.useState("");
	const [photoMessage, setPhotoMessage] = React.useState("");

	React.useEffect(() => {
		if (worker) {
			setBio(worker.bio ?? "");
			setSelectedLanguages(worker.languages);
		}
	}, [worker]);

	const toggleLanguage = React.useCallback((language: string) => {
		setSelectedLanguages((current) =>
			current.includes(language) ? current.filter((item) => item !== language) : [...current, language],
		);
		setMessage("");
	}, []);

	const onBioChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setBio(event.target.value);
		setMessage("");
	}, []);

	const onSubmit = React.useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			const updated = await updateProfile.mutateAsync({
				bio: bio.trim() || undefined,
				languages: selectedLanguages,
			});
			setBio(updated.bio ?? "");
			setSelectedLanguages(updated.languages);
			setMessage(t("app.profileSaved"));
		},
		[bio, selectedLanguages, updateProfile, t],
	);

	const onPhotoUploaded = React.useCallback(
		async (attachment: { readonly id: string }, context: { readonly idempotencyKey: string }) => {
			await updateProfile.mutateAsync({ photoAttachmentId: attachment.id, idempotencyKey: context.idempotencyKey });
			setPhotoMessage(t("app.profilePhotoSaved"));
		},
		[t, updateProfile],
	);

	if (isEmployer) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("admin.accessDenied")}</CardTitle>
					<CardDescription>{t("app.workerProfileOnly")}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	if (isLoading || !worker) {
		return <Skeleton className="h-64 w-full" />;
	}

	return (
		<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
			<section className="space-y-5">
				<div>
					<p className="text-sm font-medium text-primary">{t("app.profile")}</p>
					<h1 className="text-2xl font-semibold tracking-tight">{worker.fullName}</h1>
					<p className="mt-1 text-sm text-muted-foreground">{t("app.workerProfileEditBody")}</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("app.editableProfile")}</CardTitle>
						<CardDescription>{t("app.editableProfileBody")}</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="space-y-5" onSubmit={onSubmit}>
							<div className="space-y-2">
								<Label htmlFor="bio">{t("workers.profile.bioLabel")}</Label>
								<textarea
									id="bio"
									value={bio}
									onChange={onBioChange}
									maxLength={500}
									className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
								/>
								<p className="text-xs text-muted-foreground">{t("app.bioCount", { count: bio.length })}</p>
							</div>
							<div className="space-y-2">
								<Label>{t("workers.register.languages")}</Label>
								<div className="flex flex-wrap gap-2">
									{languages?.map((language) => (
										<button
											key={language.value}
											type="button"
											onClick={() => toggleLanguage(language.value)}
											className={`rounded-full border px-3 py-1 text-sm transition ${
												selectedLanguages.includes(language.value)
													? "border-primary bg-primary text-primary-foreground"
													: "hover:bg-muted"
											}`}
										>
											{language.labelEn}
										</button>
									))}
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Button type="submit" disabled={updateProfile.isPending}>
									{updateProfile.isPending ? t("common.saving") : t("common.save")}
								</Button>
								{message && <p className="text-sm text-primary">{message}</p>}
							</div>
						</form>
					</CardContent>
				</Card>
			</section>

			<aside className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("app.profilePhoto")}</CardTitle>
						<CardDescription>{t("app.profilePhotoBody")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-4">
							<WorkerProfilePhoto worker={worker} className="size-32 text-4xl" />
							<div className="min-w-0">
								<p className="text-sm font-medium">{worker.fullName}</p>
								<p className="mt-1 text-xs text-muted-foreground">{t("app.profilePhotoPrivacy")}</p>
							</div>
						</div>
						<AttachmentUploadField
							ownerType="worker"
							ownerId={worker.id}
							title={t("app.uploadProfilePhoto")}
							description={t("app.uploadProfilePhotoBody")}
							chooseLabel={t("files.chooseImage")}
							replaceLabel={t("files.changeImage")}
							saveLabel={t("files.savePhoto")}
							onUploaded={onPhotoUploaded}
							disabled={updateProfile.isPending}
						/>
						{photoMessage && <p className="text-sm font-medium text-primary">{photoMessage}</p>}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("app.readOnlyProfile")}</CardTitle>
						<CardDescription>{t("app.readOnlyProfileBody")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<ProfileRow label={t("workers.profile.fayda")} value={worker.fayda} />
						<ProfileRow label={t("workers.profile.phone")} value={worker.phone} />
						<ProfileRow label={t("workers.filterWoreda")} value={worker.area} />
						<ProfileRow label={t("workers.profile.registeredStation")} value={worker.registeredAtStationName ?? "-"} />
						<ProfileRow label={t("workers.filterGender")} value={t(`workers.gender${worker.gender}`)} />
						<ProfileRow label={t("workers.register.experience")} value={String(worker.experienceYears)} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("app.employmentReadiness")}</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						<Badge variant="outline">{t(`workers.tier.${worker.tier}`)}</Badge>
						<Badge variant={worker.available ? "default" : "secondary"}>
							{worker.available ? t("app.available") : t("workers.busy")}
						</Badge>
						{worker.hasHealthCard && <Badge variant="outline">{t("workers.profile.healthCard")}</Badge>}
						{worker.hasPoliceClearance && <Badge variant="outline">{t("workers.profile.policeClearance")}</Badge>}
					</CardContent>
				</Card>
			</aside>
		</div>
	);
});
WorkerProfilePage.displayName = "WorkerProfilePage";

const ProfileRow = React.memo(({ label, value }: { readonly label: string; readonly value: string }) => (
	<div className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
		<span className="text-muted-foreground">{label}</span>
		<span className="text-right font-medium">{value || "-"}</span>
	</div>
));
ProfileRow.displayName = "ProfileRow";

export const Route = createFileRoute("/app/profile")({
	component: WorkerProfilePage,
});
