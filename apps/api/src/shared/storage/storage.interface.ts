export interface StoredFile {
	key: string;
	url: string;
	filename: string;
	mimeType: string;
	size: number;
}

export interface StorageDriver {
	save(params: {
		organizationId: string;
		folder: string;
		buffer: Buffer;
		originalName: string;
		mimeType: string;
	}): Promise<StoredFile>;

	delete(key: string): Promise<void>;

	getUrl(key: string): string;
}

export const STORAGE_DRIVER = Symbol("StorageDriver");
