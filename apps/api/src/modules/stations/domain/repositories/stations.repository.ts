import type { AgentAssignment, NewStation, Station, StationPatch } from "../entities/station.entity";

export const STATIONS_REPO = Symbol("STATIONS_REPO");

export interface IStationsRepository {
	findById(id: string): Promise<Station | null>;
	listAll(includeInactive?: boolean): Promise<Station[]>;
	create(data: NewStation): Promise<Station>;
	update(id: string, patch: StationPatch): Promise<Station>;
	listAssignments(stationId: string): Promise<AgentAssignment[]>;
	listAssignmentsForUser(userId: string, activeOnly?: boolean): Promise<AgentAssignment[]>;
	assignAgent(userId: string, stationId: string): Promise<AgentAssignment>;
	removeAgent(assignmentId: string): Promise<AgentAssignment>;
}
