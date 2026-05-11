import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import type { IEmployersRepository } from "#modules/employers/domain/repositories/employers.repository";
import { EMPLOYERS_REPO } from "#modules/employers/domain/repositories/employers.repository";
import { NotificationOutboxService } from "#modules/notification/application/services/notification-outbox.service";
import { PlatformSettingsService } from "#modules/platform-settings/application/services/platform-settings.service";
import type { IRoleCatalogRepository } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import { ROLE_CATALOG_REPO } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import type { IStationsRepository } from "#modules/stations/domain/repositories/stations.repository";
import { STATIONS_REPO } from "#modules/stations/domain/repositories/stations.repository";
import type { IWorkersRepository } from "#modules/workers/domain/repositories/workers.repository";
import { WORKERS_REPO } from "#modules/workers/domain/repositories/workers.repository";
import type { WezSession } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { HIRE_REQUESTS_REPO, type IHireRequestsRepository } from "../../domain/repositories/hire-requests.repository";
import type { CancelHireRequestDto, CreateHireRequestDto, ListHireRequestsDto } from "../dto/hire-request.dto";

const HIRE_REQUEST_GLOBAL_ACCESS_ROLES = ["super_admin"] as const;
const EMPTY_SCOPE_ID = "__none__";
type ScopedHireRequestFilter = ListHireRequestsDto & { readonly stationIds?: readonly string[] };

@Injectable()
export class HireRequestsService {
	constructor(
		@Inject(HIRE_REQUESTS_REPO) private readonly repo: IHireRequestsRepository,
		@Inject(WORKERS_REPO) private readonly workers: IWorkersRepository,
		@Inject(EMPLOYERS_REPO) private readonly employers: IEmployersRepository,
		@Inject(ROLE_CATALOG_REPO) private readonly roles: IRoleCatalogRepository,
		@Inject(STATIONS_REPO) private readonly stations: IStationsRepository,
		private readonly platformSettings: PlatformSettingsService,
		private readonly notifications: NotificationOutboxService,
		private readonly staffAccess: StaffAccessService,
	) {}

	async list(filter: ScopedHireRequestFilter) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async listForSession(session: WezSession, filter: ListHireRequestsDto) {
		if (session.kind === "staff") {
			if (this.staffAccess.hasAnyRole(session, HIRE_REQUEST_GLOBAL_ACCESS_ROLES)) {
				return this.list(filter);
			}
			if (!this.staffAccess.isStationScoped(session)) throw new ForbiddenException({ code: "STATION_SCOPE_REQUIRED" });
			const stationIds = await this.staffAccess.stationIdsForSession(session);
			if (filter.stationId && !stationIds.includes(filter.stationId)) {
				throw new ForbiddenException({ code: "NOT_YOUR_STATION" });
			}
			if (stationIds.length === 0) {
				return this.list({ ...filter, stationId: EMPTY_SCOPE_ID });
			}
			return this.list({ ...filter, stationIds: filter.stationId ? undefined : stationIds });
		}

		if (session.user.role?.startsWith("employer_")) {
			const employer = await this.employers.findByUserId(session.user.id);
			if (!employer) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
			return this.list({ ...filter, employerId: employer.id });
		}

		if (session.user.role === "worker") {
			const worker = await this.workers.findByUserId(session.user.id);
			if (!worker) throw new ForbiddenException({ code: "NO_WORKER_PROFILE" });
			return this.list({ ...filter, workerId: worker.id, employerId: undefined });
		}

		return this.list(filter);
	}

	async getById(id: string) {
		const r = await this.repo.findById(id);
		if (!r) throw new NotFoundException({ code: "HIRE_REQUEST_NOT_FOUND" });
		return r;
	}

	async getByIdForSession(session: WezSession, id: string) {
		const request = await this.getById(id);
		if (session.kind === "staff") {
			await this.staffAccess.assertStationAccess(session, request.stationId, HIRE_REQUEST_GLOBAL_ACCESS_ROLES);
			return request;
		}

		if (session.user.role?.startsWith("employer_")) {
			const employer = await this.employers.findByUserId(session.user.id);
			if (!employer || request.employerId !== employer.id) {
				throw new ForbiddenException({ code: "HIRE_REQUEST_NOT_OWNED" });
			}
			return request;
		}

		if (session.user.role === "worker") {
			const worker = await this.workers.findByUserId(session.user.id);
			if (!worker || request.workerId !== worker.id) {
				throw new ForbiddenException({ code: "HIRE_REQUEST_NOT_OWNED" });
			}
			return request;
		}

		throw new ForbiddenException({ code: "HIRE_REQUEST_NOT_AVAILABLE" });
	}

	async create(currentUserId: string, dto: CreateHireRequestDto, asAgent: boolean, session?: WezSession) {
		if (asAgent && session) {
			if (!dto.stationId) throw new BadRequestException({ code: "STATION_ID_REQUIRED_FOR_STAFF_REQUEST" });
			await this.staffAccess.assertStationAccess(session, dto.stationId, HIRE_REQUEST_GLOBAL_ACCESS_ROLES);
		}
		return this.createWithSourceReferral(currentUserId, dto, asAgent, null);
	}

	async createFromReferral(currentUserId: string, dto: CreateHireRequestDto, sourceReferralId: string) {
		return this.createWithSourceReferral(currentUserId, dto, false, sourceReferralId);
	}

	private async createWithSourceReferral(
		currentUserId: string,
		dto: CreateHireRequestDto,
		asAgent: boolean,
		sourceReferralId: string | null,
	) {
		if (!asAgent && dto.channel !== "online") {
			throw new BadRequestException({ code: "ONLINE_CHANNEL_REQUIRED_FOR_CUSTOMER_REQUEST" });
		}

		const employerId = await this.resolveEmployerId(currentUserId, dto.employerId, asAgent);
		const employer = await this.employers.findById(employerId);
		if (!employer) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
		if (employer.rating === "red") throw new ForbiddenException({ code: "EMPLOYER_BANNED" });

		const worker = await this.workers.findById(dto.workerId);
		if (!worker) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		if (!worker.available) throw new ConflictException({ code: "WORKER_NOT_AVAILABLE" });
		if (!worker.roles.includes(dto.roleId)) {
			throw new ConflictException({ code: "WORKER_DOES_NOT_PERFORM_ROLE" });
		}
		const stationId = this.resolveRequestStationId(dto.stationId, asAgent, worker.registeredAtStationId);

		const role = await this.roles.findById(dto.roleId);
		if (!role?.active) throw new BadRequestException({ code: "INVALID_ROLE" });
		if (
			BigInt(dto.proposedSalaryCents) < role.salaryMinCents ||
			BigInt(dto.proposedSalaryCents) > role.salaryMaxCents
		) {
			throw new BadRequestException({
				code: "SALARY_OUT_OF_ROLE_RANGE",
				details: {
					roleSalaryMinCents: role.salaryMinCents.toString(),
					roleSalaryMaxCents: role.salaryMaxCents.toString(),
				},
			});
		}

		const station = await this.stations.findById(stationId);
		if (!station) throw new NotFoundException({ code: "STATION_NOT_FOUND" });

		const { hireRequestExpiryDays } = await this.platformSettings.getHiringPolicy();
		const expiresAt = new Date(Date.now() + hireRequestExpiryDays * 24 * 60 * 60 * 1000);

		const request = await this.repo.create({
			employerId,
			workerId: dto.workerId,
			roleId: dto.roleId,
			jobId: dto.jobId ?? null,
			proposedSalaryCents: BigInt(dto.proposedSalaryCents),
			stationId,
			status: "awaiting_visit",
			channel: dto.channel,
			note: dto.note ?? null,
			sourceReferralId,
			expiresAt,
		});
		await this.enqueueCreatedNotifications({
			requestId: request.id,
			workerPhone: worker.phone,
			workerName: worker.fullName,
			employerUserId: employer.userId,
			employerPhone: employer.phone,
			employerEmail: employer.email,
			employerName: employer.name,
			roleName: role.name,
			stationId,
			proposedSalaryCents: dto.proposedSalaryCents.toString(),
			channel: dto.channel,
		});
		return request;
	}

	private resolveRequestStationId(dtoStationId: string | undefined, asAgent: boolean, workerStationId: string | null) {
		if (asAgent) {
			if (!dtoStationId) throw new BadRequestException({ code: "STATION_ID_REQUIRED_FOR_STAFF_REQUEST" });
			return dtoStationId;
		}
		if (!workerStationId) throw new ConflictException({ code: "WORKER_REGISTERING_STATION_REQUIRED" });
		if (dtoStationId && dtoStationId !== workerStationId) {
			throw new BadRequestException({ code: "HIRE_REQUEST_STATION_DERIVED_FROM_WORKER" });
		}
		return workerStationId;
	}

	private async resolveEmployerId(currentUserId: string, employerId: string | undefined, asAgent: boolean) {
		if (asAgent) {
			if (!employerId) throw new BadRequestException({ code: "EMPLOYER_ID_REQUIRED" });
			return employerId;
		}
		const own = await this.employers.findByUserId(currentUserId);
		if (!own) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
		if (employerId && employerId !== own.id) throw new ForbiddenException({ code: "EMPLOYER_PROFILE_MISMATCH" });
		return own.id;
	}

	async cancel(id: string, dto: CancelHireRequestDto) {
		const req = await this.getById(id);
		if (req.status !== "awaiting_visit") {
			throw new ConflictException({ code: "ALREADY_FINALIZED" });
		}
		return this.repo.update(id, {
			status: "cancelled",
			cancelledAt: new Date(),
			cancellationReason: dto.reason,
		});
	}

	async cancelForSession(session: WezSession, id: string, dto: CancelHireRequestDto) {
		const req = await this.getById(id);
		if (session.kind === "staff") {
			await this.staffAccess.assertStationAccess(session, req.stationId, HIRE_REQUEST_GLOBAL_ACCESS_ROLES);
			const updated = await this.cancel(id, dto);
			await this.enqueueStaffCancelledNotifications(req, dto.reason);
			return updated;
		}

		if (session.user.role?.startsWith("employer_")) {
			const employer = await this.employers.findByUserId(session.user.id);
			if (!employer || req.employerId !== employer.id) {
				throw new ForbiddenException({ code: "HIRE_REQUEST_NOT_OWNED" });
			}
			const updated = await this.cancel(id, dto);
			await this.enqueueEmployerCancelledNotifications(req, dto.reason);
			return updated;
		}

		throw new ForbiddenException({ code: "CANCEL_NOT_ALLOWED" });
	}

	async expireDue() {
		const due = await this.repo.listExpiringBefore(new Date());
		const updated: string[] = [];
		for (const r of due) {
			await this.repo.update(r.id, { status: "expired" });
			await this.enqueueExpiredNotifications(r);
			updated.push(r.id);
		}
		return { expired: updated.length };
	}

	private async enqueueCreatedNotifications(input: {
		requestId: string;
		workerPhone: string;
		workerName: string;
		employerUserId: string | null | undefined;
		employerPhone: string;
		employerEmail: string | null | undefined;
		employerName: string;
		roleName: string;
		stationId: string;
		proposedSalaryCents: string;
		channel: string;
	}) {
		const payload = {
			hireRequestId: input.requestId,
			workerName: input.workerName,
			employerName: input.employerName,
			roleName: input.roleName,
			salaryBirr: (Number(input.proposedSalaryCents) / 100).toString(),
		};
		if (input.channel === "online") {
			await this.notifications.enqueueSms({
				phone: input.workerPhone,
				templateKey: "hire_request.created.worker",
				payload,
			});
			await this.enqueueEmployerConfirmation({
				userId: input.employerUserId,
				phone: input.employerPhone,
				email: input.employerEmail,
				payload,
			});
		}
		await this.notifications.enqueueStationAgents({
			stationId: input.stationId,
			templateKey: "hire_request.created.station_agent",
			payload,
		});
	}

	private async enqueueEmployerCancelledNotifications(
		request: { workerId: string; employerId: string; id: string },
		reason: string,
	) {
		const [worker, employer] = await Promise.all([
			this.workers.findById(request.workerId),
			this.employers.findById(request.employerId),
		]);
		const payload = { hireRequestId: request.id, reason, employerName: employer?.name ?? "" };
		if (worker) {
			await this.notifications.enqueueSms({
				phone: worker.phone,
				templateKey: "hire_request.cancelled.worker",
				payload,
			});
		}
	}

	private async enqueueStaffCancelledNotifications(
		request: { workerId: string; employerId: string; id: string },
		reason: string,
	) {
		const [worker, employer] = await Promise.all([
			this.workers.findById(request.workerId),
			this.employers.findById(request.employerId),
		]);
		const payload = {
			hireRequestId: request.id,
			reason,
			workerName: worker?.fullName ?? "",
			employerName: employer?.name ?? "",
		};
		if (worker) {
			await this.notifications.enqueueSms({
				phone: worker.phone,
				templateKey: "hire_request.cancelled.worker",
				payload,
			});
		}
		if (employer) {
			await this.enqueueEmployerNotification({
				employer,
				templateKey: "hire_request.cancelled.employer",
				payload,
				includeSms: true,
				includeEmail: true,
			});
		}
	}

	private async enqueueExpiredNotifications(request: { workerId: string; employerId: string; id: string }) {
		const [worker, employer] = await Promise.all([
			this.workers.findById(request.workerId),
			this.employers.findById(request.employerId),
		]);
		const payload = {
			hireRequestId: request.id,
			workerName: worker?.fullName ?? "",
			employerName: employer?.name ?? "",
		};
		if (worker) {
			await this.notifications.enqueueSms({
				phone: worker.phone,
				templateKey: "hire_request.expired.worker",
				payload,
			});
		}
		if (employer) {
			await this.enqueueEmployerNotification({
				employer,
				templateKey: "hire_request.expired.employer",
				payload,
				includeSms: true,
				includeEmail: false,
			});
		}
	}

	private async enqueueEmployerConfirmation(input: {
		userId: string | null | undefined;
		phone: string;
		email: string | null | undefined;
		payload: Record<string, string>;
	}) {
		if (input.userId) {
			await this.notifications.enqueueCustomer({
				userId: input.userId,
				channel: "in_app",
				templateKey: "hire_request.created.employer",
				payload: input.payload,
			});
		}
		if (input.email) {
			await this.notifications.enqueueEmail({
				email: input.email,
				templateKey: "hire_request.created.employer",
				payload: input.payload,
			});
		}
		if (!input.email) {
			await this.notifications.enqueueSms({
				phone: input.phone,
				templateKey: "hire_request.created.employer",
				payload: input.payload,
			});
		}
	}

	private async enqueueEmployerNotification(input: {
		employer: { userId?: string | null; phone: string; email?: string | null };
		templateKey: string;
		payload: Record<string, string>;
		includeSms: boolean;
		includeEmail: boolean;
	}) {
		if (input.employer.userId) {
			await this.notifications.enqueueCustomer({
				userId: input.employer.userId,
				channel: "in_app",
				templateKey: input.templateKey,
				payload: input.payload,
			});
		}
		if (input.includeSms) {
			await this.notifications.enqueueSms({
				phone: input.employer.phone,
				templateKey: input.templateKey,
				payload: input.payload,
			});
		}
		if (input.includeEmail && input.employer.email) {
			await this.notifications.enqueueEmail({
				email: input.employer.email,
				templateKey: input.templateKey,
				payload: input.payload,
			});
		}
	}
}
