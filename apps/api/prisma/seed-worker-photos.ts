import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { prisma } from "../src/shared/database/prisma-instance";

const WORKER_PHOTOS_DIR = "workerspic";
const STORAGE_NAMESPACE = "wez";
const UPLOAD_FOLDER = "attachments";
const SEED_FOLDER = "seed-workers";
const LOCAL_BUCKET = "local-wez";
const IMAGE_MIME_TYPE = "image/jpeg";
const MAX_FILENAME_LENGTH = 80;

const PHOTO_NUMBERS_BY_ROLE = {
	chef: [14, 13, 21, 28, 29],
	line_cook: [12, 20, 19],
	dishwasher: [77, 11, 78],
	cook: [17, 18, 15, 16, 20],
	barista: [34, 41, 42, 43],
	waiter: [30, 35, 36, 37, 31, 32],
	house_maid: [80, 72, 76, 67, 68],
	nanny: [46, 44, 74, 75],
	cleaner: [79, 81, 83, 78, 76],
	guard: [63, 60, 61],
	driver: [65, 66, 57, 58],
} as const satisfies Record<string, readonly number[]>;

type PrismaClient = typeof prisma;

type SeedWorkerPhotoInput = {
	readonly id: string;
	readonly fullName: string;
	readonly roles: readonly string[];
	readonly uploadedById: string;
};

type NumberedPhoto = {
	readonly number: number;
	readonly filename: string;
	readonly fullPath: string;
};

type PhotoMappedRole = keyof typeof PHOTO_NUMBERS_BY_ROLE;

const isPhotoMappedRole = (role: string): role is PhotoMappedRole => role in PHOTO_NUMBERS_BY_ROLE;

const safeName = (name: string): string => {
	const parsed = path.parse(name);
	const base = parsed.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, MAX_FILENAME_LENGTH);
	return `${base}${parsed.ext}`;
};

const storageRoot = () => path.resolve(process.env.STORAGE_ROOT ?? path.resolve(process.cwd(), "uploads"));

const resolveStoragePath = (key: string): string => {
	const root = storageRoot();
	const fullPath = path.resolve(root, key);
	if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
		throw new Error("Seed worker photo storage key escapes configured root");
	}
	return fullPath;
};

const pathExists = async (candidate: string): Promise<boolean> => {
	try {
		await fs.access(candidate);
		return true;
	} catch {
		return false;
	}
};

const findWorkerPhotosDir = async () => {
	const candidates = [
		path.resolve(process.cwd(), WORKER_PHOTOS_DIR),
		path.resolve(process.cwd(), "..", WORKER_PHOTOS_DIR),
		path.resolve(process.cwd(), "..", "..", WORKER_PHOTOS_DIR),
	] as const;
	const checks = await Promise.all(
		candidates.map(async (candidate) => ({ candidate, exists: await pathExists(candidate) })),
	);
	const match = checks.find((check) => check.exists);
	return match?.candidate ?? null;
};

const extractPhotoNumber = (filename: string): number | null => {
	const match = /^photo_(\d+)_/u.exec(filename);
	if (!match) return null;
	return Number(match[1]);
};

const readNumberedPhotos = async (dir: string): Promise<readonly NumberedPhoto[]> => {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".jpg"))
		.map((entry) => ({
			number: extractPhotoNumber(entry.name),
			filename: entry.name,
			fullPath: path.join(dir, entry.name),
		}))
		.filter((photo): photo is NumberedPhoto => typeof photo.number === "number" && Number.isFinite(photo.number))
		.sort((a, b) => a.number - b.number);
};

const photoCandidatesForWorker = (worker: SeedWorkerPhotoInput) =>
	worker.roles.flatMap((role) => (isPhotoMappedRole(role) ? PHOTO_NUMBERS_BY_ROLE[role] : []));

const selectPhoto = ({
	worker,
	photos,
	photosByNumber,
	usedPhotoNumbers,
}: {
	readonly worker: SeedWorkerPhotoInput;
	readonly photos: readonly NumberedPhoto[];
	readonly photosByNumber: ReadonlyMap<number, NumberedPhoto>;
	readonly usedPhotoNumbers: ReadonlySet<number>;
}) => {
	const rolePhotos = photoCandidatesForWorker(worker)
		.map((number) => photosByNumber.get(number))
		.filter((photo): photo is NumberedPhoto => Boolean(photo));
	const unusedRolePhoto = rolePhotos.find((photo) => !usedPhotoNumbers.has(photo.number));
	const unusedPhoto = photos.find((photo) => !usedPhotoNumbers.has(photo.number));

	return unusedRolePhoto ?? unusedPhoto ?? rolePhotos[0] ?? photos[0] ?? null;
};

const resetSeedStorageFolder = async () => {
	await fs.rm(resolveStoragePath(`${STORAGE_NAMESPACE}/${UPLOAD_FOLDER}/${SEED_FOLDER}`), {
		force: true,
		recursive: true,
	});
};

const createWorkerPhotoAttachment = async ({
	prismaClient,
	worker,
	photo,
}: {
	readonly prismaClient: PrismaClient;
	readonly worker: SeedWorkerPhotoInput;
	readonly photo: NumberedPhoto;
}) => {
	const attachmentId = randomUUID();
	const buffer = await fs.readFile(photo.fullPath);
	const filename = safeName(photo.filename);
	const key = `${STORAGE_NAMESPACE}/${UPLOAD_FOLDER}/${SEED_FOLDER}/${attachmentId}_${filename}`;
	const fullPath = resolveStoragePath(key);
	const now = new Date();

	await fs.mkdir(path.dirname(fullPath), { recursive: true });
	await fs.writeFile(fullPath, buffer);

	await prismaClient.$transaction([
		prismaClient.attachment.create({
			data: {
				id: attachmentId,
				storageProvider: "local",
				bucket: LOCAL_BUCKET,
				key,
				filename: photo.filename,
				mimeType: IMAGE_MIME_TYPE,
				sizeBytes: buffer.length,
				uploadedById: worker.uploadedById,
				ownerType: "worker",
				ownerId: worker.id,
				status: "clean",
				checksumSha256: createHash("sha256").update(buffer).digest("hex"),
				uploadedAt: now,
				scannedAt: now,
			},
		}),
		prismaClient.worker.update({
			where: { id: worker.id },
			data: { photoAttachmentId: attachmentId },
		}),
	]);
};

export const seedWorkerProfilePhotos = async ({
	prismaClient,
	workers,
}: {
	readonly prismaClient: PrismaClient;
	readonly workers: readonly SeedWorkerPhotoInput[];
}) => {
	const dir = await findWorkerPhotosDir();
	if (!dir) {
		console.warn(`  skipped worker profile photos: ${WORKER_PHOTOS_DIR}/ was not found`);
		return;
	}

	const photos = await readNumberedPhotos(dir);
	if (photos.length === 0) {
		console.warn(`  skipped worker profile photos: no JPG files found in ${WORKER_PHOTOS_DIR}/`);
		return;
	}

	await resetSeedStorageFolder();

	const photosByNumber = new Map(photos.map((photo) => [photo.number, photo]));
	const usedPhotoNumbers = new Set<number>();
	const seededWorkers = [];

	for (const worker of workers) {
		const photo = selectPhoto({ worker, photos, photosByNumber, usedPhotoNumbers });
		if (!photo) {
			console.warn(`  skipped worker profile photo for ${worker.fullName}: no unused photo available`);
			continue;
		}
		await createWorkerPhotoAttachment({ prismaClient, worker, photo });
		usedPhotoNumbers.add(photo.number);
		seededWorkers.push(worker.id);
	}

	console.log(`  ${seededWorkers.length} worker profile photos`);
};
