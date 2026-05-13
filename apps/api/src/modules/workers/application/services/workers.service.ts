import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import { auth } from "#modules/auth/auth.config";
import type { IRoleCatalogRepository } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import { ROLE_CATALOG_REPO } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import type { IStationsRepository } from "#modules/stations/domain/repositories/stations.repository";
import { STATIONS_REPO } from "#modules/stations/domain/repositories/stations.repository";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { WezSession } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { PrismaService } from "#shared/database/prisma.service";
import type { Worker, WorkerFilter } from "../../domain/entities/worker.entity";
import { type IWorkersRepository, WORKERS_REPO } from "../../domain/repositories/workers.repository";
import type { ListWorkersDto, RegisterWorkerDto, UpdateOwnWorkerProfileDto, UpdateWorkerDto } from "../dto/worker.dto";

const WORKER_ROLE = "worker";
const WORKER_GLOBAL_ACCESS_ROLES = ["super_admin", "ops_manager", "hr_manager"] as const;
const IMAGE_MIME_PREFIX = "image/";
type WorkerListAccessLevel = "global" | "own_station" | "network";
type WorkerListItem = Worker & {
	readonly accessLevel: WorkerListAccessLevel;
	readonly canOperate: boolean;
};

@Injectable()
export class WorkersService {
	constructor(
		@Inject(WORKERS_REPO) private readonly repo: IWorkersRepository,
		@Inject(ROLE_CATALOG_REPO) private readonly roles: IRoleCatalogRepository,
		@Inject(STATIONS_REPO) private readonly stations: IStationsRepository,
		private readonly prisma: PrismaService,
		private readonly auditEvents: AuditEventsService,
		private readonly staffAccess: StaffAccessService,
	) {}

	async list(filter: ListWorkersDto | WorkerFilter) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async listForSession(session: WezSession, filter: ListWorkersDto) {
		if (session.kind !== "staff" || this.staffAccess.hasAnyRole(session, WORKER_GLOBAL_ACCESS_ROLES)) {
			const result = await this.list(filter);
			if (session.kind !== "staff") return result;
			return { ...result, data: result.data.map((worker) => this.markWorkerAccess(worker, "global", true)) };
		}
		const stationIds = await this.staffAccess.stationIdsForSession(session);
		const result = await this.list(filter);
		return {
			...result,
			data: result.data.map((worker) => {
				const canOperate = !!worker.registeredAtStationId && stationIds.includes(worker.registeredAtStationId);
				return this.markWorkerAccess(worker, canOperate ? "own_station" : "network", canOperate);
			}),
		};
	}

	private markWorkerAccess(worker: Worker, accessLevel: WorkerListAccessLevel, canOperate: boolean): WorkerListItem {
		if (canOperate) return { ...worker, accessLevel, canOperate };
		return { ...worker, fayda: "", phone: "", accessLevel, canOperate };
	}

	async getById(id: string) {
		const w = await this.repo.findById(id);
		if (!w) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		return w;
	}

	async getByIdForSession(session: WezSession, id: string) {
		const worker = await this.getById(id);
		if (session.kind === "staff" && worker.registeredAtStationId) {
			await this.staffAccess.assertStationAccess(session, worker.registeredAtStationId, WORKER_GLOBAL_ACCESS_ROLES);
		}
		return worker;
	}

	async getOwnProfile(userId: string) {
		const worker = await this.repo.findByUserId(userId);
		if (!worker) throw new NotFoundException({ code: "WORKER_PROFILE_NOT_FOUND" });
		return worker;
	}

	async register(session: WezSession, dto: RegisterWorkerDto) {
		const station = await this.stations.findById(dto.stationId);
		if (!station) throw new NotFoundException({ code: "STATION_NOT_FOUND" });
		if (session.kind === "staff") {
			await this.staffAccess.assertStationAccess(session, dto.stationId, WORKER_GLOBAL_ACCESS_ROLES);
		}
		const hasEmailLogin = !!dto.loginEmail || !!dto.loginPassword;
		if (hasEmailLogin && (!dto.loginEmail || !dto.loginPassword)) {
			throw new BadRequestException({ code: "WORKER_LOGIN_EMAIL_PASSWORD_REQUIRED" });
		}

		const fayda = await this.repo.findByFayda(dto.fayda);
		if (fayda) throw new ConflictException({ code: "FAYDA_TAKEN", details: { existingWorkerId: fayda.id } });

		const phone = await this.repo.findByPhone(dto.phone);
		if (phone) throw new ConflictException({ code: "PHONE_TAKEN", details: { existingWorkerId: phone.id } });

		for (const roleId of dto.roles) {
			const r = await this.roles.findById(roleId);
			if (!r?.active) throw new ConflictException({ code: "INVALID_ROLE", details: { roleId } });
		}

		const userId = dto.loginEmail ? await this.createWorkerLogin(dto) : null;

		return this.repo.create({
			userId,
			fullName: dto.fullName,
			fayda: dto.fayda,
			phone: dto.phone,
			dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
			gender: dto.gender,
			area: dto.area,
			bio: dto.bio ?? null,
			religion: dto.religion ?? null,
			languages: dto.languages,
			experienceYears: dto.experienceYears,
			hasHealthCard: dto.hasHealthCard,
			hasPoliceClearance: dto.hasPoliceClearance,
			tin: dto.tin ?? null,
			registeredByAgentId: session.user.id,
			registeredAtStationId: dto.stationId,
			roles: dto.roles,
		});
	}

	private async createWorkerLogin(dto: RegisterWorkerDto) {
		if (!dto.loginEmail || !dto.loginPassword) return null;
		const existingUser = await this.prisma.user.findFirst({
			where: { OR: [{ email: dto.loginEmail }, { phoneNumber: dto.phone }] },
			select: { id: true, email: true, phoneNumber: true },
		});
		if (existingUser) {
			throw new ConflictException({
				code: "WORKER_LOGIN_TAKEN",
				details: { existingUserId: existingUser.id },
			});
		}

		const { user } = await auth.api.signUpEmail({
			body: {
				name: dto.fullName,
				email: dto.loginEmail,
				password: dto.loginPassword,
			},
		});
		await this.prisma.user.update({
			where: { id: user.id },
			data: { role: WORKER_ROLE, phoneNumber: dto.phone },
		});
		return user.id;
	}

	async update(id: string, dto: UpdateWorkerDto) {
		await this.getById(id);
		await this.assertProfilePhotoAttachment(id, dto.photoAttachmentId);
		if (dto.roles) {
			for (const roleId of dto.roles) {
				const r = await this.roles.findById(roleId);
				if (!r?.active) throw new ConflictException({ code: "INVALID_ROLE", details: { roleId } });
			}
		}
		return this.repo.update(id, {
			fullName: dto.fullName,
			bio: dto.bio,
			religion: dto.religion,
			languages: dto.languages,
			experienceYears: dto.experienceYears,
			hasHealthCard: dto.hasHealthCard,
			hasPoliceClearance: dto.hasPoliceClearance,
			tier: dto.tier,
			hopFlag: dto.hopFlag,
			available: dto.available,
			tin: dto.tin,
			photoAttachmentId: dto.photoAttachmentId,
			roles: dto.roles,
		});
	}

	async updateForSession(
		session: WezSession,
		id: string,
		dto: UpdateWorkerDto,
		auditContext: AuditRequestContext | undefined,
	) {
		if (session.kind === "staff") {
			await this.getByIdForSession(session, id);
			return this.update(id, dto);
		}
		const worker = await this.getOwnProfile(session.user.id);
		if (worker.id !== id) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		return this.updateOwnProfile(
			session,
			{ bio: dto.bio, languages: dto.languages, photoAttachmentId: dto.photoAttachmentId },
			auditContext,
		);
	}

	async updateOwnProfile(
		session: WezSession,
		dto: UpdateOwnWorkerProfileDto,
		auditContext: AuditRequestContext | undefined,
	) {
		const worker = await this.getOwnProfile(session.user.id);
		await this.assertProfilePhotoAttachment(worker.id, dto.photoAttachmentId);
		const updated = await this.repo.update(worker.id, {
			bio: dto.bio,
			languages: dto.languages,
			photoAttachmentId: dto.photoAttachmentId,
		});
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.workerProfileUpdated,
			targetType: AUDIT_TARGET_TYPES.worker,
			targetId: worker.id,
			stationId: worker.registeredAtStationId,
			context: auditContext,
			metadata: {
				bioChanged: dto.bio !== undefined && dto.bio !== worker.bio,
				beforeBioLength: worker.bio?.length ?? 0,
				afterBioLength: updated.bio?.length ?? 0,
				languagesChanged:
					dto.languages !== undefined &&
					dto.languages.slice().sort().join(",") !== worker.languages.slice().sort().join(","),
				beforeLanguages: worker.languages.join(","),
				afterLanguages: updated.languages.join(","),
				photoChanged: dto.photoAttachmentId !== undefined && dto.photoAttachmentId !== worker.photoAttachmentId,
			},
		});
		return updated;
	}

	private async assertProfilePhotoAttachment(workerId: string, photoAttachmentId: string | undefined) {
		if (!photoAttachmentId) return;
		const attachment = await this.prisma.attachment.findFirst({
			where: {
				id: photoAttachmentId,
				deletedAt: null,
				ownerType: "worker",
				ownerId: workerId,
			},
			select: { id: true, mimeType: true, status: true },
		});
		if (!attachment) throw new NotFoundException({ code: "WORKER_PHOTO_ATTACHMENT_NOT_FOUND" });
		if (!attachment.mimeType.toLowerCase().startsWith(IMAGE_MIME_PREFIX)) {
			throw new BadRequestException({ code: "WORKER_PHOTO_IMAGE_REQUIRED" });
		}
		if (attachment.status !== "clean") throw new ConflictException({ code: "WORKER_PHOTO_ATTACHMENT_NOT_READY" });
	}
}
