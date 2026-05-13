import { CloudUploadIcon, FileImageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { type Attachment, finalizeUpload, signUpload, uploadSignedFile } from "#features/files/api/file.queries";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;
const DEFAULT_MAX_UPLOAD_MIB = 5;
export const DEFAULT_MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_MIB * BYTES_PER_MIB;
const IMAGE_ACCEPT = "image/*";

type UploadStatus = "idle" | "selected" | "uploading" | "success" | "error";

type AttachmentUploadFieldProps = {
	readonly ownerType: string;
	readonly ownerId: string;
	readonly title: string;
	readonly description: string;
	readonly chooseLabel: string;
	readonly replaceLabel: string;
	readonly saveLabel?: string;
	readonly variant?: "panel" | "button";
	readonly accept?: string;
	readonly maxBytes?: number;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly onUploaded: (attachment: Attachment, context: { readonly idempotencyKey: string }) => Promise<void> | void;
};

export const AttachmentUploadField = React.memo(
	({
		ownerType,
		ownerId,
		title,
		description,
		chooseLabel,
		replaceLabel,
		saveLabel,
		variant = "panel",
		accept = IMAGE_ACCEPT,
		maxBytes = DEFAULT_MAX_UPLOAD_BYTES,
		disabled = false,
		className,
		onUploaded,
	}: AttachmentUploadFieldProps) => {
		const { t } = useTranslation();
		const inputId = React.useId();
		const inputRef = React.useRef<HTMLInputElement | null>(null);
		const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
		const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
		const [status, setStatus] = React.useState<UploadStatus>("idle");
		const [error, setError] = React.useState("");

		React.useEffect(
			() => () => {
				if (previewUrl) URL.revokeObjectURL(previewUrl);
			},
			[previewUrl],
		);

		const resetInput = React.useCallback(() => {
			if (inputRef.current) inputRef.current.value = "";
		}, []);

		const validateFile = React.useCallback(
			(file: File) => {
				if (file.size > maxBytes) return t("files.fileTooLarge", { size: formatFileSize(maxBytes) });
				if (accept === IMAGE_ACCEPT && !file.type.toLowerCase().startsWith("image/")) return t("files.imageOnly");
				return "";
			},
			[accept, maxBytes, t],
		);

		const uploadFile = React.useCallback(
			async (file: File) => {
				const idempotencyKey = crypto.randomUUID();
				setStatus("uploading");
				setError("");
				try {
					const signed = await signUpload(
						{
							filename: file.name,
							mimeType: file.type,
							sizeBytes: file.size,
							ownerType,
							ownerId,
						},
						`${idempotencyKey}:sign`,
					);
					await uploadSignedFile(signed, file, `${idempotencyKey}:upload`);
					const finalized = await finalizeUpload(signed.attachment.id, `${idempotencyKey}:finalize`);
					await onUploaded(finalized, { idempotencyKey: `${idempotencyKey}:attach` });
					setSelectedFile(null);
					setPreviewUrl(null);
					setStatus("success");
					resetInput();
				} catch (err) {
					setStatus("error");
					setError(err instanceof Error ? err.message : t("files.uploadFailed"));
				}
			},
			[onUploaded, ownerId, ownerType, resetInput, t],
		);

		const onFileChange = React.useCallback(
			(event: React.ChangeEvent<HTMLInputElement>) => {
				const file = event.currentTarget.files?.[0] ?? null;
				setError("");
				if (!file) return;
				const validationError = validateFile(file);
				if (validationError) {
					setSelectedFile(null);
					setPreviewUrl(null);
					setStatus("error");
					setError(validationError);
					resetInput();
					return;
				}
				if (variant === "button") {
					void uploadFile(file);
					return;
				}
				setSelectedFile(file);
				setPreviewUrl(URL.createObjectURL(file));
				setStatus("selected");
			},
			[resetInput, uploadFile, validateFile, variant],
		);

		const onUpload = React.useCallback(async () => {
			if (!selectedFile) return;
			await uploadFile(selectedFile);
		}, [selectedFile, uploadFile]);

		const helperText = React.useMemo(
			() =>
				selectedFile
					? t("files.selectedFile", { name: selectedFile.name, size: formatFileSize(selectedFile.size) })
					: t("files.maxSize", { size: formatFileSize(maxBytes) }),
			[maxBytes, selectedFile, t],
		);

		const isBusy = status === "uploading";
		const openFilePicker = React.useCallback(() => {
			if (disabled || isBusy) return;
			inputRef.current?.click();
		}, [disabled, isBusy]);

		if (variant === "button") {
			return (
				<div className={cn("space-y-2", className)}>
					<input
						ref={inputRef}
						id={inputId}
						type="file"
						accept={accept}
						onChange={onFileChange}
						disabled={disabled || isBusy}
						tabIndex={-1}
						aria-hidden="true"
						className="hidden"
					/>
					<Button type="button" onClick={openFilePicker} disabled={disabled || isBusy} className="w-full">
						{isBusy ? t("files.uploading") : chooseLabel}
					</Button>
					{error && <p className="text-xs text-destructive">{error}</p>}
				</div>
			);
		}

		return (
			<div className={cn("rounded-lg border bg-background p-4", className)}>
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept={accept}
					onChange={onFileChange}
					disabled={disabled || isBusy}
					tabIndex={-1}
					aria-hidden="true"
					className="hidden"
				/>
				<div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
					<div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border bg-muted">
						{previewUrl ? (
							<img src={previewUrl} alt={t("files.selectedPreviewAlt")} className="h-full w-full object-cover" />
						) : (
							<HugeiconsIcon icon={FileImageIcon} className="size-8 text-muted-foreground" />
						)}
					</div>
					<div className="min-w-0 space-y-3">
						<div>
							<p className="text-sm font-semibold">{title}</p>
							<p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
							<p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
						</div>
						{error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
						{status === "success" && (
							<p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{t("files.uploadReady")}</p>
						)}
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant={selectedFile ? "outline" : "default"}
								onClick={openFilePicker}
								disabled={disabled || isBusy}
							>
								{selectedFile ? replaceLabel : chooseLabel}
							</Button>
							{selectedFile && (
								<Button type="button" onClick={onUpload} disabled={disabled || isBusy}>
									<HugeiconsIcon icon={CloudUploadIcon} className="size-4" />
									{isBusy ? t("files.uploading") : (saveLabel ?? t("files.saveUpload"))}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
);
AttachmentUploadField.displayName = "AttachmentUploadField";

const formatFileSize = (bytes: number) => {
	if (bytes >= BYTES_PER_MIB) return `${(bytes / BYTES_PER_MIB).toFixed(1)} MB`;
	return `${Math.ceil(bytes / BYTES_PER_KIB)} KB`;
};
