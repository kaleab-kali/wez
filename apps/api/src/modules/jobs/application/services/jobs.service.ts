import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EMPLOYERS_REPO } from "#modules/employers/domain/repositories/employers.repository";
import type { IEmployersRepository } from "#modules/employers/domain/repositories/employers.repository";
import { ROLE_CATALOG_REPO } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import type { IRoleCatalogRepository } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import {
	IJobsRepository,
	JOBS_REPO,
} from "../../domain/repositories/jobs.repository";
import type { CreateJobDto, ListJobsDto, UpdateJobDto } from "../dto/job.dto";

@Injectable()
export class JobsService {
	constructor(
		@Inject(JOBS_REPO) private readonly repo: IJobsRepository,
		@Inject(EMPLOYERS_REPO) private readonly employers: IEmployersRepository,
		@Inject(ROLE_CATALOG_REPO) private readonly roles: IRoleCatalogRepository,
	) {}

	async list(filter: ListJobsDto) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async getById(id: string) {
		const j = await this.repo.findById(id);
		if (!j) throw new NotFoundException({ code: "JOB_NOT_FOUND" });
		return j;
	}

	async create(currentUserId: string, dto: CreateJobDto, asAgent: boolean) {
		// Resolve employerId
		let employerId = dto.employerId;
		if (!employerId) {
			if (asAgent) throw new BadRequestException({ code: "EMPLOYER_ID_REQUIRED" });
			// employer self-posting: find by user
			const own = await this.employers.findByUserId(currentUserId);
			if (!own) throw new ForbiddenException({ code: "NO_EMPLOYER_PROFILE" });
			employerId = own.id;
		} else {
			const e = await this.employers.findById(employerId);
			if (!e) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
			if (e.rating === "red") throw new ConflictException({ code: "EMPLOYER_BANNED" });
		}

		const role = await this.roles.findById(dto.roleId);
		if (!role || !role.active) throw new BadRequestException({ code: "INVALID_ROLE" });
		if (BigInt(dto.salaryMinCents) > BigInt(dto.salaryMaxCents)) {
			throw new BadRequestException({ code: "SALARY_RANGE_INVALID" });
		}
		if (
			BigInt(dto.salaryMinCents) < role.salaryMinCents ||
			BigInt(dto.salaryMaxCents) > role.salaryMaxCents
		) {
			throw new BadRequestException({
				code: "SALARY_OUT_OF_ROLE_RANGE",
				details: { roleSalaryMinCents: role.salaryMinCents.toString(), roleSalaryMaxCents: role.salaryMaxCents.toString() },
			});
		}

		return this.repo.create({
			employerId,
			roleId: dto.roleId,
			title: dto.title,
			description: dto.description,
			salaryMinCents: BigInt(dto.salaryMinCents),
			salaryMaxCents: BigInt(dto.salaryMaxCents),
			location: dto.location,
			status: "open",
		});
	}

	async update(id: string, dto: UpdateJobDto) {
		await this.getById(id);
		// roleId not editable per modules.md 5.2.2
		const { roleId: _ignore, ...rest } = dto;
		return this.repo.update(id, {
			title: rest.title,
			description: rest.description,
			salaryMinCents: rest.salaryMinCents !== undefined ? BigInt(rest.salaryMinCents) : undefined,
			salaryMaxCents: rest.salaryMaxCents !== undefined ? BigInt(rest.salaryMaxCents) : undefined,
			location: rest.location,
			status: rest.status,
		});
	}

	async close(id: string) {
		await this.getById(id);
		return this.repo.update(id, { status: "closed" });
	}
}
