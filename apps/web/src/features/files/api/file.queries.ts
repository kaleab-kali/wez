import { useQuery } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

const DOWNLOAD_URL_STALE_MINUTES = 10;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const DOWNLOAD_URL_STALE_MS = DOWNLOAD_URL_STALE_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export type Attachment = {
	readonly id: string;
	readonly storageProvider: string;
	readonly bucket: string;
	readonly key: string;
	readonly filename: string;
	readonly mimeType: string;
	readonly sizeBytes: number;
	readonly uploadedById: string | null;
	readonly ownerType: string | null;
	readonly ownerId: string | null;
	readonly status: string;
	readonly checksumSha256: string | null;
	readonly uploadedAt: string | null;
	readonly scannedAt: string | null;
	readonly expiresAt: string | null;
	readonly createdAt: string;
};

export type SignedUpload = {
	readonly attachment: Attachment;
	readonly uploadUrl: string;
	readonly method: "POST";
	readonly formField: "file";
	readonly expiresAt: string;
};

export const fileKeys = {
	all: ["files"] as const,
	downloadUrl: (attachmentId: string) => [...fileKeys.all, "download-url", attachmentId] as const,
};

export const signUpload = (
	input: {
		readonly filename: string;
		readonly mimeType: string;
		readonly sizeBytes: number;
		readonly ownerType?: string;
		readonly ownerId?: string;
	},
	idempotencyKey?: string,
) => api.post<{ data: SignedUpload }>("/files/sign-put", input, { idempotencyKey }).then((body) => body.data);

export const uploadSignedFile = async (
	signed: SignedUpload,
	file: File,
	idempotencyKey?: string,
): Promise<Attachment> => {
	const form = new FormData();
	form.set(signed.formField, file);
	const response = await fetch(signed.uploadUrl, {
		method: signed.method,
		credentials: "include",
		headers: { "Idempotency-Key": idempotencyKey ?? crypto.randomUUID() },
		body: form,
	});
	if (!response.ok) throw new Error("Upload failed");
	const body = (await response.json()) as { data: Attachment };
	return body.data;
};

export const finalizeUpload = (attachmentId: string, idempotencyKey?: string) =>
	api
		.post<{ data: Attachment }>(`/files/${attachmentId}/finalize`, undefined, { idempotencyKey })
		.then((body) => body.data);

export const getDownloadUrl = (attachmentId: string) =>
	api
		.get<{ data: { url: string; expiresAt: string } }>(`/files/${attachmentId}/download-url`)
		.then((body) => body.data);

export const useAttachmentDownloadUrl = (attachmentId: string | null | undefined) =>
	useQuery({
		queryKey: attachmentId ? fileKeys.downloadUrl(attachmentId) : [...fileKeys.all, "download-url", "none"],
		queryFn: () => getDownloadUrl(attachmentId ?? ""),
		enabled: !!attachmentId,
		staleTime: DOWNLOAD_URL_STALE_MS,
	});
