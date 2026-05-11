import { api } from "#shared/lib/api-client";

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

export const signUpload = (input: {
	readonly filename: string;
	readonly mimeType: string;
	readonly sizeBytes: number;
	readonly ownerType?: string;
	readonly ownerId?: string;
}) => api.post<{ data: SignedUpload }>("/files/sign-put", input).then((body) => body.data);

export const uploadSignedFile = async (signed: SignedUpload, file: File): Promise<Attachment> => {
	const form = new FormData();
	form.set(signed.formField, file);
	const response = await fetch(signed.uploadUrl, {
		method: signed.method,
		credentials: "include",
		headers: { "Idempotency-Key": crypto.randomUUID() },
		body: form,
	});
	if (!response.ok) throw new Error("Upload failed");
	const body = (await response.json()) as { data: Attachment };
	return body.data;
};

export const finalizeUpload = (attachmentId: string) =>
	api.post<{ data: Attachment }>(`/files/${attachmentId}/finalize`).then((body) => body.data);

export const getDownloadUrl = (attachmentId: string) =>
	api
		.get<{ data: { url: string; expiresAt: string } }>(`/files/${attachmentId}/download-url`)
		.then((body) => body.data);
