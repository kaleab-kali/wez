import { UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { AttachmentImage } from "#features/files/components/AttachmentImage";
import type { Worker } from "#features/workers/api/worker.queries";
import { cn } from "@/lib/utils";

type WorkerProfilePhotoProps = {
	readonly worker: Pick<Worker, "fullName" | "photoAttachmentId">;
	readonly className?: string;
	readonly imageClassName?: string;
	readonly fallbackClassName?: string;
};

export const WorkerProfilePhoto = React.memo(
	({ worker, className, imageClassName, fallbackClassName }: WorkerProfilePhotoProps) => {
		const initials = React.useMemo(() => getInitials(worker.fullName), [worker.fullName]);
		const fallback = React.useMemo(
			() => (
				<div className={cn("flex h-full w-full items-center justify-center", fallbackClassName)}>
					{initials || <HugeiconsIcon icon={UserMultipleIcon} className="size-10" />}
				</div>
			),
			[fallbackClassName, initials],
		);

		return (
			<AttachmentImage
				attachmentId={worker.photoAttachmentId}
				alt={worker.fullName}
				wrapperClassName={cn(
					"flex items-center justify-center overflow-hidden rounded-full border bg-background text-primary shadow-sm",
					className,
				)}
				imageClassName={cn("object-cover", imageClassName)}
				fallback={fallback}
			/>
		);
	},
);
WorkerProfilePhoto.displayName = "WorkerProfilePhoto";

const getInitials = (name: string) =>
	name
		.split(" ")
		.map((part) => part.charAt(0))
		.slice(0, 2)
		.join("")
		.toUpperCase();
