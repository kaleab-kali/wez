import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ROLE_CATALOG_REPO } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import type { IRoleCatalogRepository } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import { STATIONS_REPO } from "#modules/stations/domain/repositories/stations.repository";
import type { IStationsRepository } from "#modules/stations/domain/repositories/stations.repository";
import {
	type IWorkersRepository,
	WORKERS_REPO,
} from "../../domain/repositories/workers.repository";
import type { ListWorkersDto, RegisterWorkerDto, UpdateWorkerDto } from "../dto/worker.dto";

@Injectable()
export class WorkersService {
	constructor(
		@Inject(WORKERS_REPO) private readonly repo: IWorkersRepository,
		@Inject(ROLE_CATALOG_REPO) private readonly roles: IRoleCatalogRepository,
		@Inject(STATIONS_REPO) private readonly stations: IStationsRepository,
	) {}

	async list(filter: ListWorkersDto) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async getById(id: string) {
		const w = await this.repo.findById(id);
		if (!w) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		return w;
	}

	async register(currentAgentId: string, dto: RegisterWorkerDto) {
		const station = await this.stations.findById(dto.stationId);
		if (!station) throw new NotFoundException({ code: "STATION_NOT_FOUND" });

		const fayda = await this.repo.findByFayda(dto.fayda);
		if (fayda) throw new ConflictException({ code: "FAYDA_TAKEN", details: { existingWorkerId: fayda.id } });

		const phone = await this.repo.findByPhone(dto.phone);
		if (phone) throw new ConflictException({ code: "PHONE_TAKEN", details: { existingWorkerId: phone.id } });

		for (const roleId of dto.roles) {
			const r = await this.roles.findById(roleId);
			if (!r || !r.active) throw new ConflictException({ code: "INVALID_ROLE", details: { roleId } });
		}

		return this.repo.create({
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
			registeredByAgentId: currentAgentId,
			registeredAtStationId: dto.stationId,
			roles: dto.roles,
		});
	}

	async update(id: string, dto: UpdateWorkerDto) {
		await this.getById(id);
		if (dto.roles) {
			for (const roleId of dto.roles) {
				const r = await this.roles.findById(roleId);
				if (!r || !r.active) throw new ConflictException({ code: "INVALID_ROLE", details: { roleId } });
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
			roles: dto.roles,
		});
	}
}
