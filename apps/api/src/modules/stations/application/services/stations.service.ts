import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type IStationsRepository, STATIONS_REPO } from "../../domain/repositories/stations.repository";
import type { CreateStationDto, UpdateStationDto } from "../dto/station.dto";

@Injectable()
export class StationsService {
	constructor(@Inject(STATIONS_REPO) private readonly repo: IStationsRepository) {}

	async list(includeInactive = false) {
		return this.repo.listAll(includeInactive);
	}

	async getById(id: string) {
		const s = await this.repo.findById(id);
		if (!s) throw new NotFoundException({ code: "STATION_NOT_FOUND" });
		return s;
	}

	async create(dto: CreateStationDto) {
		return this.repo.create({
			name: dto.name,
			woreda: dto.woreda,
			address: dto.address,
			phone: dto.phone ?? null,
			active: true,
			supervisorUserId: dto.supervisorUserId ?? null,
		});
	}

	async update(id: string, patch: UpdateStationDto) {
		await this.getById(id);
		return this.repo.update(id, {
			name: patch.name,
			woreda: patch.woreda,
			address: patch.address,
			phone: patch.phone,
			supervisorUserId: patch.supervisorUserId,
			active: patch.active,
		});
	}

	async listAssignments(stationId: string) {
		await this.getById(stationId);
		return this.repo.listAssignments(stationId);
	}

	async assignAgent(stationId: string, userId: string) {
		await this.getById(stationId);
		const existing = await this.repo.listAssignmentsForUser(userId, true);
		if (existing.some((a) => a.stationId === stationId)) {
			throw new ConflictException({ code: "ALREADY_ASSIGNED" });
		}
		return this.repo.assignAgent(userId, stationId);
	}

	async removeAssignment(assignmentId: string) {
		return this.repo.removeAgent(assignmentId);
	}

	async stationsForAgent(userId: string) {
		const assignments = await this.repo.listAssignmentsForUser(userId, true);
		const stations = await Promise.all(assignments.map((a) => this.repo.findById(a.stationId)));
		return stations.filter((s): s is NonNullable<typeof s> => s !== null);
	}
}
