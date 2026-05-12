import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import type { StorageDriver, StoredFile } from "./storage.interface";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const MAX_FILENAME_LENGTH = 80;

const storageRoot = () => path.resolve(process.env.STORAGE_ROOT ?? UPLOADS_DIR);

const safeName = (name: string): string => {
	const parsed = path.parse(name);
	const base = parsed.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, MAX_FILENAME_LENGTH);
	return `${base}${parsed.ext}`;
};

const resolveKey = (key: string): string => {
	const root = storageRoot();
	const fullPath = path.resolve(root, key);
	if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
		throw new Error("Storage key escapes configured root");
	}
	return fullPath;
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
		const fullPath = resolveKey(relativePath);

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
		const fullPath = resolveKey(key);
		try {
			await fs.unlink(fullPath);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
		}
	}

	async exists(key: string): Promise<boolean> {
		const fullPath = resolveKey(key);
		try {
			await fs.access(fullPath);
			return true;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
			throw err;
		}
	}

	async read(key: string): Promise<Buffer> {
		return fs.readFile(resolveKey(key));
	}

	getUrl(key: string): string {
		return `/uploads/${key}`;
	}
}
