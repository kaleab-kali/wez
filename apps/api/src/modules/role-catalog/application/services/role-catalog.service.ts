import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
	type IRoleCatalogRepository,
	ROLE_CATALOG_REPO,
} from "../../domain/repositories/role-catalog.repository";
import type { CreateRoleDto, UpdateRoleDto } from "../dto/role.dto";

@Injectable()
export class RoleCatalogService {
	constructor(@Inject(ROLE_CATALOG_REPO) private readonly repo: IRoleCatalogRepository) {}

	async list(includeInactive = false) {
		return this.repo.listAll(includeInactive);
	}

	async getById(id: string) {
		const r = await this.repo.findById(id);
		if (!r) throw new NotFoundException({ code: "ROLE_NOT_FOUND" });
		return r;
	}

	async create(dto: CreateRoleDto) {
		if (BigInt(dto.salaryMinCents) > BigInt(dto.salaryMaxCents)) {
			throw new BadRequestException({ code: "SALARY_RANGE_INVALID" });
		}
		if (dto.commType === "percent" && dto.commValue > 100) {
			throw new BadRequestException({ code: "PERCENT_OUT_OF_RANGE" });
		}
		const existing = await this.repo.findById(dto.id);
		if (existing) throw new ConflictException({ code: "ROLE_ID_TAKEN" });

		return this.repo.create({
			id: dto.id,
			name: dto.name,
			category: dto.category,
			commType: dto.commType,
			commValue: dto.commValue,
			salaryMinCents: BigInt(dto.salaryMinCents),
			salaryMaxCents: BigInt(dto.salaryMaxCents),
			active: true,
		});
	}

	async update(id: string, dto: UpdateRoleDto) {
		const existing = await this.getById(id);
		const min = dto.salaryMinCents ?? existing.salaryMinCents;
		const max = dto.salaryMaxCents ?? existing.salaryMaxCents;
		if (BigInt(min) > BigInt(max)) {
			throw new BadRequestException({ code: "SALARY_RANGE_INVALID" });
		}
		const commType = dto.commType ?? existing.commType;
		const commValue = dto.commValue ?? existing.commValue;
		if (commType === "percent" && commValue > 100) {
			throw new BadRequestException({ code: "PERCENT_OUT_OF_RANGE" });
		}
		return this.repo.update(id, {
			name: dto.name,
			category: dto.category,
			commType: dto.commType,
			commValue: dto.commValue,
			salaryMinCents: dto.salaryMinCents !== undefined ? BigInt(dto.salaryMinCents) : undefined,
			salaryMaxCents: dto.salaryMaxCents !== undefined ? BigInt(dto.salaryMaxCents) : undefined,
			active: dto.active,
		});
	}
}
