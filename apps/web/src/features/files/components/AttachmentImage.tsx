import React from "react";
import { useAttachmentDownloadUrl } from "#features/files/api/file.queries";
import { cn } from "@/lib/utils";

type AttachmentImageProps = {
	readonly attachmentId: string | null | undefined;
	readonly alt: string;
	readonly wrapperClassName?: string;
	readonly imageClassName?: string;
	readonly fallback: React.ReactNode;
};

export const AttachmentImage = React.memo(
	({ attachmentId, alt, wrapperClassName, imageClassName, fallback }: AttachmentImageProps) => {
		const { data, isLoading } = useAttachmentDownloadUrl(attachmentId);

		return (
			<div className={wrapperClassName}>
				{data?.url ? (
					<img
						src={data.url}
						alt={alt}
						loading="lazy"
						decoding="async"
						className={cn("h-full w-full", imageClassName)}
					/>
				) : (
					<div className={cn("h-full w-full", isLoading ? "animate-pulse" : "")}>{fallback}</div>
				)}
			</div>
		);
	},
);
AttachmentImage.displayName = "AttachmentImage";
