import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { type IStationsRepository, STATIONS_REPO } from "../../domain/repositories/stations.repository";
import type { CreateStationDto, UpdateStationDto } from "../dto/station.dto";

@Injectable()
export class StationsService {
	constructor(
		@Inject(STATIONS_REPO) private readonly repo: IStationsRepository,
		private readonly prisma: PrismaService,
	) {}

	async list(includeInactive = false) {
		return this.repo.listAll(includeInactive);
	}

	async getById(id: string) {
		const s = await this.repo.findById(id);
		if (!s) throw new NotFoundException({ code: "STATION_NOT_FOUND" });
		return s;
	}

	async create(dto: CreateStationDto) {
		const stationInput = await this.resolveCreateInput(dto);
		return this.repo.create({
			name: stationInput.name,
			woreda: stationInput.woreda,
			address: stationInput.address,
			phone: dto.phone ?? null,
			active: true,
			localityId: stationInput.localityId,
			custom: stationInput.custom,
			customReason: stationInput.customReason,
			supervisorUserId: dto.supervisorUserId ?? null,
		});
	}

	async update(id: string, patch: UpdateStationDto) {
		await this.getById(id);
		const stationInput = patch.localityId ? await this.resolveLocationStationInput(patch.localityId) : null;
		return this.repo.update(id, {
			name: patch.name ?? stationInput?.name,
			woreda: patch.woreda ?? stationInput?.woreda,
			address: patch.address ?? stationInput?.address,
			phone: patch.phone,
			localityId: patch.localityId,
			custom: patch.custom,
			customReason: patch.customReason,
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

	private async resolveCreateInput(dto: CreateStationDto) {
		if (dto.custom === true) {
			if (!dto.name || !dto.woreda || !dto.address || !dto.customReason) {
				throw new BadRequestException({ code: "CUSTOM_STATION_FIELDS_REQUIRED" });
			}
			return {
				name: dto.name,
				woreda: dto.woreda,
				address: dto.address,
				localityId: dto.localityId ?? null,
				custom: true,
				customReason: dto.customReason,
			};
		}
		if (!dto.localityId) {
			throw new BadRequestException({ code: "LOCALITY_REQUIRED" });
		}
		return { ...(await this.resolveLocationStationInput(dto.localityId)), custom: false, customReason: null };
	}

	private async resolveLocationStationInput(localityId: string) {
		const locality = await this.prisma.location.findFirst({
			where: { id: localityId, kind: "locality", active: true, deletedAt: null },
			include: { parent: { include: { parent: true } } },
		});
		if (!locality) throw new BadRequestException({ code: "LOCALITY_NOT_FOUND" });
		const subArea = locality.parent;
		const adminArea = subArea?.parent;
		if (!subArea || !adminArea) throw new BadRequestException({ code: "LOCATION_HIERARCHY_INCOMPLETE" });
		const subAreaName = subArea.nameEn.replace(/\s+(Subcity|City Administration)$/u, "");
		return {
			name: `${subAreaName} ${locality.nameEn} Station`,
			woreda: locality.code,
			address: `${subArea.nameEn}, ${locality.nameEn}, ${adminArea.nameEn}`,
			localityId: locality.id,
		};
	}
}
