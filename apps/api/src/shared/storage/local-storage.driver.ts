import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import type { StorageDriver, StoredFile } from "./storage.interface";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const MAX_FILENAME_LENGTH = 80;

const safeName = (name: string): string => {
	const parsed = path.parse(name);
	const base = parsed.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, MAX_FILENAME_LENGTH);
	return `${base}${parsed.ext}`;
};

@Injectable()
export class LocalStorageDriver implements StorageDriver {
	async save(params: {
		organizationId: string;
		folder: string;
		buffer: Buffer;
		originalName: string;
		mimeType: string;
	}): Promise<StoredFile> {
		const filename = `${createId()}_${safeName(params.originalName)}`;
		const relativePath = path.join(params.organizationId, params.folder, filename);
		const fullPath = path.join(UPLOADS_DIR, relativePath);

		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, params.buffer);

		const key = relativePath.replace(/\\/g, "/");
		return {
			key,
			url: this.getUrl(key),
			filename: params.originalName,
			mimeType: params.mimeType,
			size: params.buffer.length,
		};
	}

	async delete(key: string): Promise<void> {
		const fullPath = path.join(UPLOADS_DIR, key);
		try {
			await fs.unlink(fullPath);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
		}
	}

	getUrl(key: string): string {
		return `/uploads/${key}`;
	}
}
