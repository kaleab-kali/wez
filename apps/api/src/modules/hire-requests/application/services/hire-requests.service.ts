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
import { HIRE_REQUESTS_REPO, type IHireRequestsRepository } from "../../domain/repositories/hire-requests.repository";
import type { CancelHireRequestDto, CreateHireRequestDto, ListHireRequestsDto } from "../dto/hire-request.dto";

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
	) {}

	async list(filter: ListHireRequestsDto) {
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
			return this.list(filter);
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

	async create(currentUserId: string, dto: CreateHireRequestDto, asAgent: boolean) {
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
		// Resolve employerId
		let employerId = dto.employerId;
		if (!employerId) {
			if (asAgent) throw new BadRequestException({ code: "EMPLOYER_ID_REQUIRED" });
			const own = await this.employers.findByUserId(currentUserId);
			if (!own) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
			employerId = own.id;
		}
		const employer = await this.employers.findById(employerId);
		if (!employer) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
		if (employer.rating === "red") throw new ForbiddenException({ code: "EMPLOYER_BANNED" });

		const worker = await this.workers.findById(dto.workerId);
		if (!worker) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		if (!worker.available) throw new ConflictException({ code: "WORKER_NOT_AVAILABLE" });
		if (!worker.roles.includes(dto.roleId)) {
			throw new ConflictException({ code: "WORKER_DOES_NOT_PERFORM_ROLE" });
		}

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

		const station = await this.stations.findById(dto.stationId);
		if (!station) throw new NotFoundException({ code: "STATION_NOT_FOUND" });

		const { hireRequestExpiryDays } = await this.platformSettings.getHiringPolicy();
		const expiresAt = new Date(Date.now() + hireRequestExpiryDays * 24 * 60 * 60 * 1000);

		const request = await this.repo.create({
			employerId,
			workerId: dto.workerId,
			roleId: dto.roleId,
			jobId: dto.jobId ?? null,
			proposedSalaryCents: BigInt(dto.proposedSalaryCents),
			stationId: dto.stationId,
			status: "awaiting_visit",
			channel: dto.channel,
			note: dto.note ?? null,
			sourceReferralId,
			expiresAt,
		});
		await this.enqueueCreatedNotifications({
			requestId: request.id,
			workerUserId: worker.userId,
			workerPhone: worker.phone,
			workerName: worker.fullName,
			employerName: employer.name,
			roleName: role.name,
			stationId: dto.stationId,
			proposedSalaryCents: dto.proposedSalaryCents.toString(),
			channel: dto.channel,
		});
		return request;
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
			const updated = await this.cancel(id, dto);
			await this.enqueueCancelledNotifications(req, dto.reason);
			return updated;
		}

		if (session.user.role?.startsWith("employer_")) {
			const employer = await this.employers.findByUserId(session.user.id);
			if (!employer || req.employerId !== employer.id) {
				throw new ForbiddenException({ code: "HIRE_REQUEST_NOT_OWNED" });
			}
			const updated = await this.cancel(id, dto);
			await this.enqueueCancelledNotifications(req, dto.reason);
			return updated;
		}

		throw new ForbiddenException({ code: "CANNOT_CANCEL_HIRE_REQUEST" });
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
		workerUserId: string | null | undefined;
		workerPhone: string;
		workerName: string;
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
		if (input.workerUserId && input.channel === "online") {
			await this.notifications.enqueueCustomer({
				userId: input.workerUserId,
				channel: "sms",
				templateKey: "hire_request.created.worker",
				payload,
			});
		}
		if (!input.workerUserId && input.channel === "online") {
			await this.notifications.enqueueSms({
				phone: input.workerPhone,
				templateKey: "hire_request.created.worker",
				payload,
			});
		}
		await this.notifications.enqueueStationAgents({
			stationId: input.stationId,
			templateKey: "hire_request.created.station_agent",
			payload,
		});
	}

	private async enqueueCancelledNotifications(
		request: { workerId: string; employerId: string; id: string },
		reason: string,
	) {
		const [worker, employer] = await Promise.all([
			this.workers.findById(request.workerId),
			this.employers.findById(request.employerId),
		]);
		const payload = { hireRequestId: request.id, reason };
		if (worker?.userId) {
			await this.notifications.enqueueCustomer({
				userId: worker.userId,
				channel: "sms",
				templateKey: "hire_request.cancelled.worker",
				payload,
			});
		}
		if (worker && !worker.userId) {
			await this.notifications.enqueueSms({
				phone: worker.phone,
				templateKey: "hire_request.cancelled.worker",
				payload,
			});
		}
		if (employer?.userId) {
			await this.notifications.enqueueCustomer({
				userId: employer.userId,
				channel: "in_app",
				templateKey: "hire_request.cancelled.employer",
				payload,
			});
		}
	}

	private async enqueueExpiredNotifications(request: { workerId: string; employerId: string; id: string }) {
		const [worker, employer] = await Promise.all([
			this.workers.findById(request.workerId),
			this.employers.findById(request.employerId),
		]);
		const payload = { hireRequestId: request.id };
		if (worker?.userId) {
			await this.notifications.enqueueCustomer({
				userId: worker.userId,
				channel: "sms",
				templateKey: "hire_request.expired.worker",
				payload,
			});
		}
		if (worker && !worker.userId) {
			await this.notifications.enqueueSms({
				phone: worker.phone,
				templateKey: "hire_request.expired.worker",
				payload,
			});
		}
		if (employer?.userId) {
			await this.notifications.enqueueCustomer({
				userId: employer.userId,
				channel: "sms",
				templateKey: "hire_request.expired.employer",
				payload,
			});
		}
	}
}
