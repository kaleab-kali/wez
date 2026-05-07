import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type ILookupsRepository, LOOKUPS_REPO } from "../../domain/repositories/lookups.repository";
import type { CreateLookupDto, UpdateLookupDto } from "../dto/lookup.dto";

@Injectable()
export class LookupsService {
	constructor(@Inject(LOOKUPS_REPO) private readonly repo: ILookupsRepository) {}

	listByKind(kind: string, includeArchived = false) {
		return this.repo.listByKind(kind, includeArchived);
	}

	listAll(includeArchived = false) {
		return this.repo.listAll(includeArchived);
	}

	async getById(id: string) {
		const r = await this.repo.findById(id);
		if (!r) throw new NotFoundException({ code: "LOOKUP_NOT_FOUND" });
		return r;
	}

	async create(dto: CreateLookupDto) {
		const existing = await this.repo.listByKind(dto.kind, true);
		if (existing.some((l) => l.value === dto.value)) {
			throw new ConflictException({ code: "LOOKUP_VALUE_TAKEN" });
		}
		return this.repo.create({
			kind: dto.kind,
			value: dto.value,
			labelEn: dto.labelEn,
			labelAm: dto.labelAm ?? null,
			sortOrder: dto.sortOrder ?? 0,
			archived: false,
		});
	}

	async update(id: string, dto: UpdateLookupDto) {
		await this.getById(id);
		return this.repo.update(id, {
			labelEn: dto.labelEn,
			labelAm: dto.labelAm,
			sortOrder: dto.sortOrder,
			archived: dto.archived,
		});
	}
}
