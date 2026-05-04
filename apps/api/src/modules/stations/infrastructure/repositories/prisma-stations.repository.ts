import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { AgentAssignment, NewStation, Station, StationPatch } from "../../domain/entities/station.entity";
import type { IStationsRepository } from "../../domain/repositories/stations.repository";

const toStation = (row: {
	id: string;
	name: string;
	woreda: string;
	address: string;
	phone: string | null;
	active: boolean;
	supervisorUserId: string | null;
	createdAt: Date;
	updatedAt: Date;
}): Station => ({
	id: row.id,
	name: row.name,
	woreda: row.woreda,
	address: row.address,
	phone: row.phone,
	active: row.active,
	supervisorUserId: row.supervisorUserId,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

const toAssignment = (row: {
	id: string;
	userId: string;
	stationId: string;
	active: boolean;
	assignedAt: Date;
	removedAt: Date | null;
}): AgentAssignment => ({
	id: row.id,
	userId: row.userId,
	stationId: row.stationId,
	active: row.active,
	assignedAt: row.assignedAt,
	removedAt: row.removedAt,
});

@Injectable()
export class PrismaStationsRepository implements IStationsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.station.findUnique({ where: { id } });
		return row ? toStation(row) : null;
	}

	async listAll(includeInactive = false) {
		const rows = await this.prisma.station.findMany({
			where: includeInactive ? {} : { active: true },
			orderBy: { name: "asc" },
		});
		return rows.map(toStation);
	}

	async create(data: NewStation) {
		const row = await this.prisma.station.create({
			data: {
				name: data.name,
				woreda: data.woreda,
				address: data.address,
				phone: data.phone,
				active: data.active,
				supervisorUserId: data.supervisorUserId,
			},
		});
		return toStation(row);
	}

	async update(id: string, patch: StationPatch) {
		const row = await this.prisma.station.update({ where: { id }, data: patch });
		return toStation(row);
	}

	async listAssignments(stationId: string) {
		const rows = await this.prisma.agentAssignment.findMany({
			where: { stationId, active: true },
			orderBy: { assignedAt: "desc" },
		});
		return rows.map(toAssignment);
	}

	async listAssignmentsForUser(userId: string, activeOnly = true) {
		const rows = await this.prisma.agentAssignment.findMany({
			where: activeOnly ? { userId, active: true } : { userId },
			orderBy: { assignedAt: "desc" },
		});
		return rows.map(toAssignment);
	}

	async assignAgent(userId: string, stationId: string) {
		const row = await this.prisma.agentAssignment.create({
			data: { userId, stationId, active: true },
		});
		return toAssignment(row);
	}

	async removeAgent(assignmentId: string) {
		const row = await this.prisma.agentAssignment.update({
			where: { id: assignmentId },
			data: { active: false, removedAt: new Date() },
		});
		return toAssignment(row);
	}
}
