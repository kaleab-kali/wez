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
import { HireRequestsService } from "#modules/hire-requests/application/services/hire-requests.service";
import { JobsService } from "#modules/jobs/application/services/jobs.service";
import { NotificationOutboxService } from "#modules/notification/application/services/notification-outbox.service";
import type { IWorkersRepository } from "#modules/workers/domain/repositories/workers.repository";
import { WORKERS_REPO } from "#modules/workers/domain/repositories/workers.repository";
import type { WezSession } from "#shared/auth/session";
import { type IReferralsRepository, REFERRALS_REPO } from "../../domain/repositories/referrals.repository";
import type { AcceptReferralDto, CreateReferralDto, DeferReferralDto, ListReferralsDto } from "../dto/referral.dto";

const PENDING_STATUS = "pending_employer";
const CONVERTED_STATUS = "converted";
const DECLINED_STATUS = "declined";
const EXPIRED_STATUS = "expired";
const REFERRAL_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReferralsService {
	constructor(
		@Inject(REFERRALS_REPO) private readonly repo: IReferralsRepository,
		@Inject(WORKERS_REPO) private readonly workers: IWorkersRepository,
		@Inject(EMPLOYERS_REPO) private readonly employers: IEmployersRepository,
		private readonly jobs: JobsService,
		private readonly hireRequests: HireRequestsService,
		private readonly notifications: NotificationOutboxService,
	) {}

	async listForSession(session: WezSession, filter: ListReferralsDto) {
		const scoped = await this.scopeFilter(session, filter);
		const { items, total } = await this.repo.listByFilter(scoped);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
	}

	async create(agentId: string, dto: CreateReferralDto) {
		const [worker, employer] = await Promise.all([
			this.workers.findById(dto.workerId),
			this.employers.findById(dto.employerId),
		]);
		if (!worker) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		if (!employer) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
		if (employer.rating === "red") throw new ConflictException({ code: "EMPLOYER_BANNED" });
		if (!worker.available) throw new ConflictException({ code: "WORKER_NOT_AVAILABLE" });

		if (dto.jobId) {
			const job = await this.jobs.getById(dto.jobId);
			if (job.employerId !== employer.id) throw new BadRequestException({ code: "JOB_EMPLOYER_MISMATCH" });
			if (job.status !== "open") throw new ConflictException({ code: "JOB_NOT_OPEN" });
			if (!worker.roles.includes(job.roleId)) throw new ConflictException({ code: "WORKER_DOES_NOT_PERFORM_ROLE" });
		}

		const referral = await this.repo.create({
			workerId: worker.id,
			employerId: employer.id,
			jobId: dto.jobId ?? null,
			agentId,
			note: dto.note ?? null,
			status: PENDING_STATUS,
			expiresAt: new Date(Date.now() + REFERRAL_TTL_DAYS * DAY_MS),
		});

		if (employer.userId) {
			await this.createPendingEmployerNotifications(employer.userId, {
				referralId: referral.id,
				workerName: worker.fullName,
				employerName: employer.name,
			});
		}
		if (!employer.userId) {
			await this.createPendingEmployerContactNotifications(employer.phone, employer.email, {
				referralId: referral.id,
				workerName: worker.fullName,
				employerName: employer.name,
			});
		}

		return referral;
	}

	async accept(session: WezSession, id: string, dto: AcceptReferralDto) {
		const referral = await this.getPendingOwnedReferral(session, id);
		const job = referral.jobId ? await this.jobs.getById(referral.jobId) : null;
		const roleId = job?.roleId ?? dto.roleId;
		if (!roleId) throw new BadRequestException({ code: "ROLE_ID_REQUIRED" });

		const request = await this.hireRequests.createFromReferral(
			session.user.id,
			{
				employerId: referral.employerId,
				workerId: referral.workerId,
				roleId,
				jobId: referral.jobId ?? undefined,
				proposedSalaryCents: dto.proposedSalaryCents,
				stationId: dto.stationId,
				channel: "online",
				note: dto.note ?? referral.note ?? undefined,
			},
			referral.id,
		);
		const updated = await this.repo.update(referral.id, { status: CONVERTED_STATUS });
		return { referral: updated, hireRequest: request };
	}

	async decline(session: WezSession, id: string, reason: string) {
		const referral = await this.getPendingOwnedReferral(session, id);
		return this.repo.update(referral.id, { status: DECLINED_STATUS, declineReason: reason });
	}

	async defer(session: WezSession, id: string, dto: DeferReferralDto) {
		const referral = await this.getPendingOwnedReferral(session, id);
		return this.repo.update(referral.id, { expiresAt: new Date(Date.now() + dto.days * DAY_MS) });
	}

	async expireDue() {
		const due = await this.repo.listExpiringBefore(new Date());
		for (const referral of due) {
			await this.repo.update(referral.id, { status: EXPIRED_STATUS });
		}
		return { expired: due.length };
	}

	private async getPendingOwnedReferral(session: WezSession, id: string) {
		const referral = await this.repo.findById(id);
		if (!referral) throw new NotFoundException({ code: "REFERRAL_NOT_FOUND" });
		if (referral.status !== PENDING_STATUS) throw new ConflictException({ code: "REFERRAL_NOT_PENDING" });
		if (referral.expiresAt.getTime() <= Date.now()) {
			await this.repo.update(referral.id, { status: EXPIRED_STATUS });
			throw new ConflictException({ code: "REFERRAL_EXPIRED" });
		}

		if (session.kind === "staff") return referral;

		const employer = await this.employers.findByUserId(session.user.id);
		if (!employer || employer.id !== referral.employerId) {
			throw new ForbiddenException({ code: "REFERRAL_NOT_OWNED" });
		}
		return referral;
	}

	private async scopeFilter(session: WezSession, filter: ListReferralsDto) {
		if (session.kind === "staff") return filter;

		if (session.user.role?.startsWith("employer_")) {
			const employer = await this.employers.findByUserId(session.user.id);
			if (!employer) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
			return { ...filter, employerId: employer.id };
		}

		throw new ForbiddenException({ code: "REFERRALS_NOT_AVAILABLE" });
	}

	private async createPendingEmployerNotifications(
		userId: string,
		payload: { referralId: string; workerName: string; employerName: string },
	) {
		const channels = ["in_app", "email", "sms"] as const;
		for (const channel of channels) {
			await this.notifications.enqueueCustomer({
				userId,
				channel,
				templateKey: "referral.created.employer",
				payload,
			});
		}
	}

	private async createPendingEmployerContactNotifications(
		phone: string,
		email: string | null | undefined,
		payload: { referralId: string; workerName: string; employerName: string },
	) {
		await this.notifications.enqueueSms({
			phone,
			templateKey: "referral.created.employer",
			payload,
		});
		if (email) {
			await this.notifications.enqueueEmail({
				email,
				templateKey: "referral.created.employer",
				payload,
			});
		}
	}
}
