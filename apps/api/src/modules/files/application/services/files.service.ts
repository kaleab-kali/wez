import { createHash, randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import type { WezSession } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { PrismaService } from "#shared/database/prisma.service";
import { STORAGE_DRIVER, type StorageDriver } from "#shared/storage/storage.interface";
import { MAX_UPLOAD_BYTES, type SignPutFileDto } from "../dto/file.dto";
import { VirusScanService } from "./virus-scan.service";

const STORAGE_NAMESPACE = "wez";
const UPLOAD_FOLDER = "attachments";
const LOCAL_BUCKET = "local-wez";
const TEMP_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const DOWNLOAD_URL_TTL_MS = 15 * 60 * 1000;
const FILE_CONTENT_URL_PREFIX = "/api/v1/files";
const FILE_GLOBAL_ACCESS_ROLES = [
	"super_admin",
	"ops_manager",
	"compliance_officer",
	"hr_manager",
	"finance_manager",
	"it_manager",
] as const;

type UploadedFile = {
	readonly buffer: Buffer;
	readonly originalname: string;
	readonly mimetype: string;
	readonly size: number;
};

@Injectable()
export class FilesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly staffAccess: StaffAccessService,
		private readonly virusScan: VirusScanService,
		@Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
	) {}

	async signPut(session: WezSession, dto: SignPutFileDto) {
		await this.assertCreateAccess(session, dto);
		const id = randomUUID();
		const expiresAt = new Date(Date.now() + TEMP_UPLOAD_TTL_MS);
		const attachment = await this.prisma.attachment.create({
			data: {
				id,
				storageProvider: "local",
				bucket: LOCAL_BUCKET,
				key: `pending/${id}`,
				filename: dto.filename,
				mimeType: dto.mimeType,
				sizeBytes: dto.sizeBytes,
				uploadedById: session.user.id,
				ownerType: dto.ownerType ?? "temp",
				ownerId: dto.ownerId,
				status: "pending",
				expiresAt,
			},
		});
		return {
			data: {
				attachment,
				uploadUrl: `/api/v1/files/${id}/upload`,
				method: "POST",
				formField: "file",
				expiresAt,
			},
		};
	}

	async upload(session: WezSession, id: string, file: UploadedFile | undefined) {
		if (!file) throw new BadRequestException({ code: "FILE_REQUIRED" });
		if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestException({ code: "FILE_TOO_LARGE" });
		const attachment = await this.getAttachment(id);
		await this.assertUploadAccess(session, attachment);
		if (attachment.status !== "pending") throw new ConflictException({ code: "ATTACHMENT_ALREADY_UPLOADED" });
		if (attachment.expiresAt && attachment.expiresAt < new Date()) {
			throw new ConflictException({ code: "ATTACHMENT_UPLOAD_EXPIRED" });
		}
		if (file.size !== attachment.sizeBytes) throw new BadRequestException({ code: "FILE_SIZE_MISMATCH" });
		if (file.mimetype !== attachment.mimeType) throw new BadRequestException({ code: "FILE_TYPE_MISMATCH" });

		const stored = await this.storage.save({
			organizationId: STORAGE_NAMESPACE,
			folder: UPLOAD_FOLDER,
			buffer: file.buffer,
			originalName: file.originalname,
			mimeType: file.mimetype,
		});
		const checksumSha256 = createHash("sha256").update(file.buffer).digest("hex");
		return {
			data: await this.prisma.attachment.update({
				where: { id },
				data: {
					bucket: LOCAL_BUCKET,
					key: stored.key,
					filename: stored.filename,
					mimeType: stored.mimeType,
					sizeBytes: stored.size,
					checksumSha256,
					status: "scanning",
					uploadedAt: new Date(),
				},
			}),
		};
	}

	async finalize(session: WezSession, id: string) {
		const attachment = await this.getAttachment(id);
		await this.assertReadAccess(session, attachment);
		if (attachment.status === "clean") return { data: attachment };
		if (attachment.status !== "scanning") throw new ConflictException({ code: "ATTACHMENT_UPLOAD_REQUIRED" });
		await this.assertStoredObjectExists(attachment.key);

		const scan = await this.virusScan.scan({ filename: attachment.filename, mimeType: attachment.mimeType });
		return {
			data: await this.prisma.attachment.update({
				where: { id },
				data: {
					status: scan.clean ? "clean" : "infected",
					scannedAt: new Date(),
				},
			}),
		};
	}

	async downloadUrl(session: WezSession, id: string) {
		const attachment = await this.getAttachment(id);
		await this.assertReadAccess(session, attachment);
		if (attachment.status !== "clean") throw new ConflictException({ code: "ATTACHMENT_NOT_AVAILABLE" });
		await this.assertStoredObjectExists(attachment.key);
		return {
			data: {
				url: `${FILE_CONTENT_URL_PREFIX}/${attachment.id}/content`,
				expiresAt: new Date(Date.now() + DOWNLOAD_URL_TTL_MS),
			},
		};
	}

	async downloadContent(session: WezSession, id: string) {
		const attachment = await this.getAttachment(id);
		await this.assertReadAccess(session, attachment);
		if (attachment.status !== "clean") throw new ConflictException({ code: "ATTACHMENT_NOT_AVAILABLE" });
		await this.assertStoredObjectExists(attachment.key);
		return {
			buffer: await this.storage.read(attachment.key),
			filename: attachment.filename,
			mimeType: attachment.mimeType,
			sizeBytes: attachment.sizeBytes,
		};
	}

	async cleanupExpiredTempUploads() {
		const expired = await this.prisma.attachment.findMany({
			where: {
				status: { in: ["pending", "scanning"] },
				expiresAt: { lt: new Date() },
			},
			select: { id: true, key: true, status: true },
		});
		for (const attachment of expired) {
			if (attachment.status === "scanning") await this.storage.delete(attachment.key);
			await this.prisma.attachment.update({
				where: { id: attachment.id },
				data: { status: "deleted", deletedAt: new Date() },
			});
		}
		return { deleted: expired.length };
	}

	private async getAttachment(id: string) {
		const attachment = await this.prisma.attachment.findUnique({ where: { id } });
		if (!attachment || attachment.deletedAt) throw new NotFoundException({ code: "ATTACHMENT_NOT_FOUND" });
		return attachment;
	}

	private async assertUploadAccess(session: WezSession, attachment: { readonly uploadedById: string | null }) {
		if (attachment.uploadedById === session.user.id) return;
		throw new ForbiddenException({ code: "ATTACHMENT_UPLOAD_NOT_ALLOWED" });
	}

	private async assertReadAccess(
		session: WezSession,
		attachment: {
			readonly id: string;
			readonly uploadedById: string | null;
			readonly ownerType: string | null;
			readonly ownerId: string | null;
		},
	) {
		if (attachment.uploadedById === session.user.id) return;
		await this.assertOwnerAccess(session, attachment);
	}

	private async assertCreateAccess(session: WezSession, dto: SignPutFileDto) {
		const ownerType = dto.ownerType ?? "temp";
		const ownerId = dto.ownerId ?? null;
		if (ownerType === "temp") {
			if (ownerId) throw new BadRequestException({ code: "ATTACHMENT_OWNER_ID_NOT_ALLOWED" });
			return;
		}
		if (!ownerId) throw new BadRequestException({ code: "ATTACHMENT_OWNER_ID_REQUIRED" });
		await this.assertOwnerAccess(session, { ownerType, ownerId });
	}

	private async assertOwnerAccess(
		session: WezSession,
		attachment: {
			readonly id?: string;
			readonly ownerType: string | null;
			readonly ownerId: string | null;
		},
	) {
		if (session.kind === "staff") {
			if (this.staffAccess.hasAnyRole(session, FILE_GLOBAL_ACCESS_ROLES)) return;
		}
		if (!attachment.ownerType || !attachment.ownerId || attachment.ownerType === "temp") {
			throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
		}
		if (attachment.ownerType === "worker")
			return this.assertWorkerOwnerAccess(session, attachment.ownerId, attachment.id);
		if (attachment.ownerType === "employer") return this.assertEmployerOwnerAccess(session, attachment.ownerId);
		if (attachment.ownerType === "placement") return this.assertPlacementOwnerAccess(session, attachment.ownerId);
		if (attachment.ownerType === "complaint") return this.assertComplaintOwnerAccess(session, attachment.ownerId);
		if (attachment.ownerType === "ticket") return this.assertTicketOwnerAccess(session, attachment.ownerId);
		if (attachment.ownerType === "course") return this.assertCourseOwnerAccess(session, attachment.ownerId);
		if (attachment.ownerType === "government_report")
			return this.assertGovernmentReportOwnerAccess(session, attachment.ownerId);
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertWorkerOwnerAccess(session: WezSession, workerId: string, attachmentId?: string) {
		const worker = await this.prisma.worker.findUnique({
			where: { id: workerId },
			select: { userId: true, registeredAtStationId: true, photoAttachmentId: true },
		});
		if (!worker) throw new NotFoundException({ code: "ATTACHMENT_OWNER_NOT_FOUND" });
		if (attachmentId && worker.photoAttachmentId === attachmentId) return;
		if (session.kind === "customer" && worker.userId === session.user.id) return;
		if (session.kind === "staff" && worker.registeredAtStationId) {
			await this.staffAccess.assertStationAccess(session, worker.registeredAtStationId, FILE_GLOBAL_ACCESS_ROLES);
			return;
		}
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertEmployerOwnerAccess(session: WezSession, employerId: string) {
		const employer = await this.prisma.employer.findUnique({
			where: { id: employerId },
			select: { userId: true, registeredByAgentId: true },
		});
		if (!employer) throw new NotFoundException({ code: "ATTACHMENT_OWNER_NOT_FOUND" });
		if (session.kind === "customer" && employer.userId === session.user.id) return;
		if (session.kind === "staff" && employer.registeredByAgentId) {
			const agentIds = await this.staffAccess.agentIdsForSession(session);
			if (agentIds.includes(employer.registeredByAgentId)) return;
		}
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertPlacementOwnerAccess(session: WezSession, placementId: string) {
		const placement = await this.prisma.placement.findUnique({
			where: { id: placementId },
			select: {
				stationId: true,
				worker: { select: { userId: true } },
				employer: { select: { userId: true } },
			},
		});
		if (!placement) throw new NotFoundException({ code: "ATTACHMENT_OWNER_NOT_FOUND" });
		if (session.kind === "customer" && [placement.worker.userId, placement.employer.userId].includes(session.user.id))
			return;
		if (session.kind === "staff") {
			await this.staffAccess.assertStationAccess(session, placement.stationId, FILE_GLOBAL_ACCESS_ROLES);
			return;
		}
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertComplaintOwnerAccess(session: WezSession, complaintId: string) {
		const complaint = await this.prisma.complaint.findUnique({
			where: { id: complaintId },
			select: {
				filedByUserId: true,
				stationId: true,
				takenByAgentId: true,
				assignedToAgentId: true,
				placement: {
					select: {
						stationId: true,
						worker: { select: { userId: true } },
						employer: { select: { userId: true } },
					},
				},
			},
		});
		if (!complaint) throw new NotFoundException({ code: "ATTACHMENT_OWNER_NOT_FOUND" });
		const customerIds = [
			complaint.filedByUserId,
			complaint.placement?.worker.userId,
			complaint.placement?.employer.userId,
		];
		if (session.kind === "customer" && customerIds.includes(session.user.id)) return;
		if (session.kind === "staff") {
			if ([complaint.takenByAgentId, complaint.assignedToAgentId].includes(session.user.id)) return;
			const stationId = complaint.stationId ?? complaint.placement?.stationId;
			if (stationId) {
				await this.staffAccess.assertStationAccess(session, stationId, FILE_GLOBAL_ACCESS_ROLES);
				return;
			}
		}
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertTicketOwnerAccess(session: WezSession, ticketId: string) {
		if (session.kind !== "staff") throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
		const ticket = await this.prisma.ticket.findUnique({
			where: { id: ticketId },
			select: { raisedById: true, assignedToId: true, resolvedById: true },
		});
		if (!ticket) throw new NotFoundException({ code: "ATTACHMENT_OWNER_NOT_FOUND" });
		if ([ticket.raisedById, ticket.assignedToId, ticket.resolvedById].includes(session.user.id)) return;
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertCourseOwnerAccess(session: WezSession, courseId: string) {
		const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
		if (!course) throw new NotFoundException({ code: "ATTACHMENT_OWNER_NOT_FOUND" });
		if (session.kind === "staff" && this.staffAccess.hasAnyRole(session, FILE_GLOBAL_ACCESS_ROLES)) return;
		if (session.kind === "customer") {
			const enrollment = await this.prisma.courseEnrollment.findFirst({
				where: { courseId, worker: { userId: session.user.id } },
				select: { id: true },
			});
			if (enrollment) return;
		}
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertGovernmentReportOwnerAccess(session: WezSession, reportId: string) {
		const report = await this.prisma.governmentReport.findUnique({ where: { id: reportId }, select: { id: true } });
		if (!report) throw new NotFoundException({ code: "ATTACHMENT_OWNER_NOT_FOUND" });
		if (session.kind === "staff" && this.staffAccess.hasAnyRole(session, FILE_GLOBAL_ACCESS_ROLES)) return;
		throw new ForbiddenException({ code: "ATTACHMENT_NOT_IN_SCOPE" });
	}

	private async assertStoredObjectExists(key: string) {
		if (await this.storage.exists(key)) return;
		throw new ConflictException({ code: "ATTACHMENT_FILE_MISSING" });
	}
}
