import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import type { IEmployersRepository } from "#modules/employers/domain/repositories/employers.repository";
import { EMPLOYERS_REPO } from "#modules/employers/domain/repositories/employers.repository";
import type { IRoleCatalogRepository } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import { ROLE_CATALOG_REPO } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";
import type { Job, JobPatch } from "../../domain/entities/job.entity";
import { IJobsRepository, JOBS_REPO } from "../../domain/repositories/jobs.repository";
import type { CreateJobDto, ListJobsDto, UpdateJobDto } from "../dto/job.dto";

const DEFAULT_JOB_PAGE = 1;
const DEFAULT_JOB_LIMIT = 20;
const STALE_JOB_DAYS = 90;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SYSTEM_ACTOR_ROLE = "system";

type JobLifecycleWriter = Pick<PrismaService, "auditEvent" | "job">;

@Injectable()
export class JobsService {
	constructor(
		@Inject(JOBS_REPO) private readonly repo: IJobsRepository,
		@Inject(EMPLOYERS_REPO) private readonly employers: IEmployersRepository,
		@Inject(ROLE_CATALOG_REPO) private readonly roles: IRoleCatalogRepository,
		private readonly auditEvents: AuditEventsService,
		private readonly prisma: PrismaService,
	) {}

	async list(filter: ListJobsDto) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? DEFAULT_JOB_PAGE;
		const limit = filter.limit ?? DEFAULT_JOB_LIMIT;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async listForSession(session: WezSession, filter: ListJobsDto) {
		if (session.kind === "staff") {
			return this.list(filter);
		}

		if (session.user.role === "worker") {
			return this.list({ ...filter, status: "open", employerId: undefined });
		}

		const employer = await this.employers.findByUserId(session.user.id);
		if (!employer) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });

		return this.list({ ...filter, employerId: employer.id });
	}

	async getById(id: string) {
		const j = await this.repo.findById(id);
		if (!j) throw new NotFoundException({ code: "JOB_NOT_FOUND" });
		return j;
	}

	async getByIdForSession(session: WezSession, id: string) {
		const job = await this.getById(id);
		if (session.kind === "staff") {
			return job;
		}

		if (session.user.role === "worker") {
			if (job.status !== "open") throw new NotFoundException({ code: "JOB_NOT_FOUND" });
			return job;
		}

		const employer = await this.employers.findByUserId(session.user.id);
		if (!employer || job.employerId !== employer.id) {
			throw new ForbiddenException({ code: "JOB_NOT_OWNED" });
		}
		return job;
	}

	async create(session: WezSession, dto: CreateJobDto, auditContext: AuditRequestContext | undefined) {
		const asAgent = session.kind === "staff";
		let employerId: string;
		if (asAgent) {
			if (!dto.employerId) throw new BadRequestException({ code: "EMPLOYER_ID_REQUIRED" });
			const e = await this.employers.findById(dto.employerId);
			if (!e) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
			if (e.rating === "red") throw new ConflictException({ code: "EMPLOYER_BANNED" });
			employerId = dto.employerId;
		} else {
			const own = await this.employers.findByUserId(session.user.id);
			if (!own) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
			if (own.rating === "red") throw new ConflictException({ code: "EMPLOYER_BANNED" });
			employerId = own.id;
		}

		const role = await this.roles.findById(dto.roleId);
		if (!role?.active) throw new BadRequestException({ code: "INVALID_ROLE" });
		this.assertSalaryRange(
			BigInt(dto.salaryMinCents),
			BigInt(dto.salaryMaxCents),
			role.salaryMinCents,
			role.salaryMaxCents,
		);

		const job = await this.repo.create({
			employerId,
			roleId: dto.roleId,
			title: dto.title,
			description: dto.description,
			schedule: dto.schedule,
			requirements: dto.requirements,
			perks: dto.perks,
			salaryMinCents: BigInt(dto.salaryMinCents),
			salaryMaxCents: BigInt(dto.salaryMaxCents),
			location: dto.location,
			autoCloseOnPlacement: dto.autoCloseOnPlacement ?? true,
			status: "open",
		});
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.jobCreated,
			targetType: AUDIT_TARGET_TYPES.job,
			targetId: job.id,
			context: auditContext,
			metadata: {
				changedFields: "created",
				employerId,
				roleId: dto.roleId,
				title: dto.title,
				afterTitle: job.title,
				afterSalaryMinCents: job.salaryMinCents.toString(),
				afterSalaryMaxCents: job.salaryMaxCents.toString(),
				status: job.status,
				afterStatus: job.status,
			},
		});
		return job;
	}

	async update(id: string, dto: UpdateJobDto, session: WezSession, auditContext: AuditRequestContext | undefined) {
		const existing = await this.getById(id);
		const role = await this.roles.findById(existing.roleId);
		if (!role) throw new BadRequestException({ code: "INVALID_ROLE" });
		const nextSalaryMinCents = dto.salaryMinCents !== undefined ? BigInt(dto.salaryMinCents) : existing.salaryMinCents;
		const nextSalaryMaxCents = dto.salaryMaxCents !== undefined ? BigInt(dto.salaryMaxCents) : existing.salaryMaxCents;
		this.assertSalaryRange(nextSalaryMinCents, nextSalaryMaxCents, role.salaryMinCents, role.salaryMaxCents);
		// roleId not editable per modules.md 5.2.2
		const { roleId: _ignore, ...rest } = dto;
		const patch: JobPatch = {
			title: rest.title,
			description: rest.description,
			schedule: rest.schedule,
			requirements: rest.requirements,
			perks: rest.perks,
			salaryMinCents: rest.salaryMinCents !== undefined ? BigInt(rest.salaryMinCents) : undefined,
			salaryMaxCents: rest.salaryMaxCents !== undefined ? BigInt(rest.salaryMaxCents) : undefined,
			location: rest.location,
			autoCloseOnPlacement: rest.autoCloseOnPlacement,
			status: rest.status,
		};
		const updated = await this.repo.update(id, patch);
		await this.recordJobUpdated(session, auditContext, existing, updated, patch);
		return updated;
	}

	async updateForSession(
		session: WezSession,
		id: string,
		dto: UpdateJobDto,
		auditContext: AuditRequestContext | undefined,
	) {
		const existing = await this.getById(id);
		if (session.kind === "staff") {
			return this.update(id, dto, session, auditContext);
		}

		const employer = await this.employers.findByUserId(session.user.id);
		if (!employer || existing.employerId !== employer.id) {
			throw new ForbiddenException({ code: "JOB_NOT_OWNED" });
		}

		return this.update(id, dto, session, auditContext);
	}

	async close(id: string, session: WezSession, auditContext: AuditRequestContext | undefined) {
		await this.getById(id);
		const job = await this.repo.update(id, { status: "closed" });
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.jobClosed,
			targetType: AUDIT_TARGET_TYPES.job,
			targetId: job.id,
			context: auditContext,
			metadata: {
				changedFields: "status",
				employerId: job.employerId,
				roleId: job.roleId,
				title: job.title,
				afterTitle: job.title,
				afterSalaryMinCents: job.salaryMinCents.toString(),
				afterSalaryMaxCents: job.salaryMaxCents.toString(),
				status: job.status,
				afterStatus: job.status,
			},
		});
		return job;
	}

	async closeForSession(session: WezSession, id: string, auditContext: AuditRequestContext | undefined) {
		const existing = await this.getById(id);
		if (session.kind === "staff") {
			return this.close(id, session, auditContext);
		}

		const employer = await this.employers.findByUserId(session.user.id);
		if (!employer || existing.employerId !== employer.id) {
			throw new ForbiddenException({ code: "JOB_NOT_OWNED" });
		}

		return this.close(id, session, auditContext);
	}

	async fillFromPlacement(
		writer: JobLifecycleWriter,
		jobId: string,
		session: WezSession,
		auditContext: AuditRequestContext | undefined,
	) {
		const job = await writer.job.findFirst({
			where: { id: jobId, deletedAt: null },
			select: {
				id: true,
				employerId: true,
				roleId: true,
				title: true,
				salaryMinCents: true,
				salaryMaxCents: true,
				status: true,
				autoCloseOnPlacement: true,
			},
		});
		if (!job || job.status !== "open" || !job.autoCloseOnPlacement) return null;

		const result = await writer.job.updateMany({
			where: { id: job.id, deletedAt: null, status: "open", autoCloseOnPlacement: true },
			data: { status: "filled" },
		});
		if (result.count === 0) return null;

		const updated = await writer.job.findUniqueOrThrow({
			where: { id: job.id },
			select: {
				id: true,
				employerId: true,
				roleId: true,
				title: true,
				salaryMinCents: true,
				salaryMaxCents: true,
				status: true,
			},
		});
		await this.recordJobClosed(writer, {
			actorId: session.user.id,
			actorRole: session.user.role ?? session.kind,
			auditContext,
			job: updated,
			changedFields: "status",
		});
		return updated;
	}

	async closeStaleOpenJobs(now = new Date()) {
		const cutoff = new Date(now.getTime() - STALE_JOB_DAYS * DAY_IN_MS);
		const due = await this.prisma.job.findMany({
			where: { deletedAt: null, status: "open", postedAt: { lte: cutoff } },
			select: {
				id: true,
				employerId: true,
				roleId: true,
				title: true,
				salaryMinCents: true,
				salaryMaxCents: true,
				status: true,
			},
			take: 100,
		});

		for (const job of due) {
			await this.prisma.$transaction(async (tx) => {
				const result = await tx.job.updateMany({
					where: { id: job.id, deletedAt: null, status: "open", postedAt: { lte: cutoff } },
					data: { status: "closed" },
				});
				if (result.count === 0) return;

				const updated = await tx.job.findUniqueOrThrow({
					where: { id: job.id },
					select: {
						id: true,
						employerId: true,
						roleId: true,
						title: true,
						salaryMinCents: true,
						salaryMaxCents: true,
						status: true,
					},
				});
				await this.recordJobClosed(tx, {
					actorId: null,
					actorRole: SYSTEM_ACTOR_ROLE,
					auditContext: undefined,
					job: updated,
					changedFields: "status,stale_90_days",
				});
			});
		}

		return { closed: due.length };
	}

	private async recordJobUpdated(
		session: WezSession,
		auditContext: AuditRequestContext | undefined,
		before: Job,
		after: Job,
		patch: JobPatch,
	) {
		const changedFields = Object.entries(patch)
			.filter(([, value]) => value !== undefined)
			.map(([field]) => field)
			.join(",");
		await this.auditEvents.recordEvent({
			actorId: session.user.id,
			actorRole: session.user.role,
			action: AUDIT_ACTIONS.jobUpdated,
			targetType: AUDIT_TARGET_TYPES.job,
			targetId: after.id,
			context: auditContext,
			metadata: {
				changedFields,
				beforeTitle: before.title,
				afterTitle: after.title,
				beforeSalaryMinCents: before.salaryMinCents.toString(),
				afterSalaryMinCents: after.salaryMinCents.toString(),
				beforeSalaryMaxCents: before.salaryMaxCents.toString(),
				afterSalaryMaxCents: after.salaryMaxCents.toString(),
				beforeStatus: before.status,
				afterStatus: after.status,
			},
		});
	}

	private async recordJobClosed(
		writer: JobLifecycleWriter,
		input: {
			actorId: string | null;
			actorRole: string;
			auditContext: AuditRequestContext | undefined;
			job: {
				id: string;
				employerId: string;
				roleId: string;
				title: string;
				salaryMinCents: bigint;
				salaryMaxCents: bigint;
				status: string;
			};
			changedFields: string;
		},
	) {
		await this.auditEvents.record(writer, {
			actorId: input.actorId,
			actorRole: input.actorRole,
			action: AUDIT_ACTIONS.jobClosed,
			targetType: AUDIT_TARGET_TYPES.job,
			targetId: input.job.id,
			context: input.auditContext,
			metadata: {
				changedFields: input.changedFields,
				employerId: input.job.employerId,
				roleId: input.job.roleId,
				title: input.job.title,
				afterTitle: input.job.title,
				afterSalaryMinCents: input.job.salaryMinCents.toString(),
				afterSalaryMaxCents: input.job.salaryMaxCents.toString(),
				status: input.job.status,
				afterStatus: input.job.status,
			},
		});
	}

	private assertSalaryRange(
		salaryMinCents: bigint,
		salaryMaxCents: bigint,
		roleSalaryMinCents: bigint,
		roleSalaryMaxCents: bigint,
	) {
		if (salaryMinCents > salaryMaxCents) {
			throw new BadRequestException({ code: "SALARY_RANGE_INVALID" });
		}
		if (salaryMinCents < roleSalaryMinCents || salaryMaxCents > roleSalaryMaxCents) {
			throw new BadRequestException({
				code: "SALARY_OUT_OF_ROLE_RANGE",
				details: {
					roleSalaryMinCents: roleSalaryMinCents.toString(),
					roleSalaryMaxCents: roleSalaryMaxCents.toString(),
				},
			});
		}
	}
}
