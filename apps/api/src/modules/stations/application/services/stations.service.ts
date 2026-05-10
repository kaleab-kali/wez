import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "#modules/audit-log/audit-actions";
import { AuditEventsService } from "#modules/audit-log/audit-events.service";
import type { AuditRequestContext } from "#shared/audit/audit-context";
import { PrismaService } from "#shared/database/prisma.service";
import { type IStationsRepository, STATIONS_REPO } from "../../domain/repositories/stations.repository";
import type { CreateStationDto, UpdateStationDto } from "../dto/station.dto";

@Injectable()
export class StationsService {
	constructor(
		@Inject(STATIONS_REPO) private readonly repo: IStationsRepository,
		private readonly prisma: PrismaService,
		private readonly auditEvents: AuditEventsService,
	) {}

	async list(includeInactive = false) {
		return this.repo.listAll(includeInactive);
	}

	async getById(id: string) {
		const s = await this.repo.findById(id);
		if (!s) throw new NotFoundException({ code: "STATION_NOT_FOUND" });
		return s;
	}

	async create(
		dto: CreateStationDto,
		auditInput?: { actorId?: string; actorRole?: string; context?: AuditRequestContext },
	) {
		const stationInput = await this.resolveCreateInput(dto);
		const created = await this.repo.create({
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
		await this.auditEvents.recordEvent({
			actorId: auditInput?.actorId,
			actorRole: auditInput?.actorRole,
			action: AUDIT_ACTIONS.stationCreated,
			targetType: AUDIT_TARGET_TYPES.station,
			targetId: created.id,
			stationId: created.id,
			context: auditInput?.context,
			metadata: {
				localityId: created.localityId,
				custom: created.custom,
				supervisorUserId: created.supervisorUserId,
			},
		});
		return created;
	}

	async update(
		id: string,
		patch: UpdateStationDto,
		auditInput?: { actorId?: string; actorRole?: string; context?: AuditRequestContext },
	) {
		await this.getById(id);
		const stationInput = patch.localityId ? await this.resolveLocationStationInput(patch.localityId) : null;
		const updated = await this.repo.update(id, {
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
		await this.auditEvents.recordEvent({
			actorId: auditInput?.actorId,
			actorRole: auditInput?.actorRole,
			action: AUDIT_ACTIONS.stationUpdated,
			targetType: AUDIT_TARGET_TYPES.station,
			targetId: id,
			stationId: id,
			context: auditInput?.context,
			metadata: {
				localityId: updated.localityId,
				active: updated.active,
				custom: updated.custom,
				supervisorUserId: updated.supervisorUserId,
			},
		});
		return updated;
	}

	async listAssignments(stationId: string) {
		await this.getById(stationId);
		return this.repo.listAssignments(stationId);
	}

	async assignAgent(
		stationId: string,
		userId: string,
		auditInput?: { actorId?: string; actorRole?: string; context?: AuditRequestContext },
	) {
		await this.getById(stationId);
		const existing = await this.repo.listAssignmentsForUser(userId, true);
		if (existing.some((a) => a.stationId === stationId)) {
			throw new ConflictException({ code: "ALREADY_ASSIGNED" });
		}
		const assignment = await this.repo.assignAgent(userId, stationId);
		await this.auditEvents.recordEvent({
			actorId: auditInput?.actorId,
			actorRole: auditInput?.actorRole,
			action: AUDIT_ACTIONS.stationAgentAssigned,
			targetType: AUDIT_TARGET_TYPES.agentAssignment,
			targetId: assignment.id,
			stationId,
			context: auditInput?.context,
			metadata: { userId, stationId },
		});
		return assignment;
	}

	async removeAssignment(
		assignmentId: string,
		auditInput?: { actorId?: string; actorRole?: string; context?: AuditRequestContext },
	) {
		const removed = await this.repo.removeAgent(assignmentId);
		await this.auditEvents.recordEvent({
			actorId: auditInput?.actorId,
			actorRole: auditInput?.actorRole,
			action: AUDIT_ACTIONS.stationAgentUnassigned,
			targetType: AUDIT_TARGET_TYPES.agentAssignment,
			targetId: assignmentId,
			stationId: removed.stationId,
			context: auditInput?.context,
			metadata: { userId: removed.userId, stationId: removed.stationId },
		});
		return removed;
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
