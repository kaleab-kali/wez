import React from "react";
import { useTranslation } from "react-i18next";
import type { Worker } from "#features/workers/api/worker.queries";
import { WorkerProfilePhoto } from "#features/workers/components/WorkerProfilePhoto";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WorkerDirectoryCardProps = {
	readonly worker: Worker;
	readonly variant: "staff" | "customer";
	readonly canOperate?: boolean;
	readonly showNetworkBadge?: boolean;
};

const TIER_VARIANT: Record<Worker["tier"], "default" | "secondary" | "outline"> = {
	basic: "outline",
	verified: "secondary",
	trained: "default",
	trusted: "default",
};

const formatRoleId = (roleId: string) =>
	roleId
		.split("_")
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ");

export const WorkerDirectoryCard = React.memo(
	({ worker, variant, canOperate = true, showNetworkBadge = false }: WorkerDirectoryCardProps) => {
		const { t } = useTranslation();
		const primaryRole = worker.roles[0] ? formatRoleId(worker.roles[0]) : t("workers.profile.skillsTitle");
		const stationLabel = worker.registeredAtStationName ?? t("hireRequests.workerStationPending");
		const ratingLabel = worker.ratingAverage !== null ? worker.ratingAverage.toFixed(1) : t("workers.ratingNone");
		const isStaffVariant = variant === "staff";

		return (
			<Card
				className={cn(
					"h-full overflow-hidden",
					canOperate
						? "transition-all group-hover:border-primary/40 group-hover:shadow-sm"
						: "border-dashed bg-muted/20",
				)}
			>
				<CardContent className="p-4">
					<div className="flex min-w-0 items-start gap-4">
						<WorkerProfilePhoto
							worker={worker}
							className={
								isStaffVariant
									? "size-20 shrink-0 text-2xl sm:size-24 sm:text-3xl"
									: "size-16 shrink-0 text-xl sm:size-20 sm:text-2xl"
							}
						/>
						<div className="min-w-0 flex-1 space-y-2">
							<div className="min-w-0">
								<CardTitle
									className={cn(
										"leading-snug break-words [overflow-wrap:anywhere]",
										isStaffVariant ? "text-lg" : "text-base",
									)}
								>
									{worker.fullName}
								</CardTitle>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
									{primaryRole} / {worker.gender === "M" ? t("workers.genderM") : t("workers.genderF")} /{" "}
									{t("workers.expYearsShort", { n: worker.experienceYears })}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-1.5">
								<Badge variant={TIER_VARIANT[worker.tier]} className="capitalize">
									{worker.tier}
								</Badge>
								<Badge variant="outline" className="font-normal">
									{t("workers.ratingLabel")}: {ratingLabel}
								</Badge>
								{!worker.available && (
									<Badge variant="secondary" className="font-normal">
										{t("workers.busy")}
									</Badge>
								)}
								{showNetworkBadge && !canOperate && (
									<Badge variant="secondary" className="font-normal">
										{t("workers.networkOnly")}
									</Badge>
								)}
								{worker.hopFlag !== "none" && (
									<Badge variant="destructive" className="capitalize text-[10px]">
										{worker.hopFlag}
									</Badge>
								)}
							</div>
							<p className="text-xs leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
								{t("hireRequests.station")}: {stationLabel}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	},
);
WorkerDirectoryCard.displayName = "WorkerDirectoryCard";
