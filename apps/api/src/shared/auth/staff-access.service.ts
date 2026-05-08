import { ForbiddenException, Injectable } from "@nestjs/common";
import type { WezAdminRole } from "#modules/auth/permissions";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";

const STATION_SCOPED_ROLES = ["agent", "station_supervisor"] as const satisfies readonly WezAdminRole[];
const GLOBAL_SCOPE = "global";
const STATION_SCOPE = "station";
const LOCALITY_SCOPE = "locality";
const SUB_AREA_SCOPE = "sub_area";
const ADMIN_AREA_SCOPE = "admin_area";
const SCOPE_TYPES = [GLOBAL_SCOPE, ADMIN_AREA_SCOPE, SUB_AREA_SCOPE, LOCALITY_SCOPE, STATION_SCOPE] as const;

type ScopeType = (typeof SCOPE_TYPES)[number];
type StaffScopeAssignment = {
	role: string;
	scopeType: string;
	scopeId: string | null;
};

@Injectable()
export class StaffAccessService {
	constructor(private readonly prisma: PrismaService) {}

	effectiveRoles(session: WezSession): readonly string[] {
		return Array.from(
			new Set([session.user.role, ...(session.user.roles ?? [])].filter((role): role is string => !!role)),
		);
	}

	hasAnyRole(session: WezSession, roles: readonly string[]): boolean {
		const effectiveRoles = this.effectiveRoles(session);
		return roles.some((role) => effectiveRoles.includes(role));
	}

	isStationScoped(session: WezSession): boolean {
		return this.hasAnyRole(session, STATION_SCOPED_ROLES);
	}

	async stationIdsForSession(session: WezSession): Promise<string[]> {
		if (session.kind !== "staff") return [];
		const assignments = await this.activeScopeAssignments(session.user.id);
		const scopedAssignments = assignments.filter((assignment) =>
			this.effectiveRoles(session).includes(assignment.role),
		);
		const stationIds = await this.stationIdsForAssignments(scopedAssignments);
		const legacyStationIds = await this.legacyStationIdsForSession(session);
		return Array.from(new Set([...stationIds, ...legacyStationIds]));
	}

	async agentIdsForSession(session: WezSession): Promise<string[]> {
		const effectiveRoles = this.effectiveRoles(session);
		const agentIds: string[] = [];

		if (effectiveRoles.includes("agent")) {
			agentIds.push(session.user.id);
		}

		if (effectiveRoles.includes("station_supervisor")) {
			const stationIds = await this.stationIdsForSession(session);
			if (stationIds.length > 0) {
				const assignments = await this.prisma.agentAssignment.findMany({
					where: { stationId: { in: stationIds }, active: true, removedAt: null },
					select: { userId: true },
				});
				agentIds.push(...assignments.map((assignment) => assignment.userId));
			}
		}

		return Array.from(new Set(agentIds));
	}

	async assertStationAccess(session: WezSession, stationId: string, unrestrictedRoles: readonly string[]) {
		if (session.kind !== "staff") {
			throw new ForbiddenException({ code: "STAFF_SESSION_REQUIRED" });
		}
		if (this.hasAnyRole(session, unrestrictedRoles)) return;

		const stationIds = await this.stationIdsForSession(session);
		if (!stationIds.includes(stationId)) throw new ForbiddenException({ code: "NOT_YOUR_STATION" });
	}

	private async activeScopeAssignments(adminUserId: string): Promise<StaffScopeAssignment[]> {
		return this.prisma.staffRoleAssignment.findMany({
			where: { adminUserId, active: true, revokedAt: null },
			select: { role: true, scopeType: true, scopeId: true },
		});
	}

	private async stationIdsForAssignments(assignments: readonly StaffScopeAssignment[]): Promise<string[]> {
		const stationScopeIds = assignments
			.filter((assignment) => assignment.scopeType === STATION_SCOPE && assignment.scopeId)
			.map((assignment) => assignment.scopeId as string);
		const localityIds = assignments
			.filter((assignment) => assignment.scopeType === LOCALITY_SCOPE && assignment.scopeId)
			.map((assignment) => assignment.scopeId as string);
		const subAreaIds = assignments
			.filter((assignment) => assignment.scopeType === SUB_AREA_SCOPE && assignment.scopeId)
			.map((assignment) => assignment.scopeId as string);
		const adminAreaIds = assignments
			.filter((assignment) => assignment.scopeType === ADMIN_AREA_SCOPE && assignment.scopeId)
			.map((assignment) => assignment.scopeId as string);

		const scopedStationIds = await this.stationIdsForLocationScopes(localityIds, subAreaIds, adminAreaIds);
		return Array.from(new Set([...stationScopeIds, ...scopedStationIds]));
	}

	private async stationIdsForLocationScopes(
		localityIds: readonly string[],
		subAreaIds: readonly string[],
		adminAreaIds: readonly string[],
	): Promise<string[]> {
		const localityIdsFromSubAreas = await this.childLocationIds(subAreaIds, LOCALITY_SCOPE);
		const subAreaIdsFromAdminAreas = await this.childLocationIds(adminAreaIds, SUB_AREA_SCOPE);
		const localityIdsFromAdminAreas = await this.childLocationIds(subAreaIdsFromAdminAreas, LOCALITY_SCOPE);
		const allLocalityIds = Array.from(
			new Set([...localityIds, ...localityIdsFromSubAreas, ...localityIdsFromAdminAreas]),
		);
		if (allLocalityIds.length === 0) return [];
		const stations = await this.prisma.station.findMany({
			where: { localityId: { in: allLocalityIds }, active: true },
			select: { id: true },
		});
		return stations.map((station) => station.id);
	}

	private async childLocationIds(parentIds: readonly string[], kind: ScopeType): Promise<string[]> {
		if (parentIds.length === 0) return [];
		const locations = await this.prisma.location.findMany({
			where: { parentId: { in: [...parentIds] }, kind, active: true, deletedAt: null },
			select: { id: true },
		});
		return locations.map((location) => location.id);
	}

	private async legacyStationIdsForSession(session: WezSession): Promise<string[]> {
		const effectiveRoles = this.effectiveRoles(session);
		const stationIds: string[] = [];
		if (effectiveRoles.includes("agent")) {
			const assignments = await this.prisma.agentAssignment.findMany({
				where: { userId: session.user.id, active: true, removedAt: null },
				select: { stationId: true },
			});
			stationIds.push(...assignments.map((assignment) => assignment.stationId));
		}
		if (effectiveRoles.includes("station_supervisor")) {
			const stations = await this.prisma.station.findMany({
				where: { supervisorUserId: session.user.id, active: true },
				select: { id: true },
			});
			stationIds.push(...stations.map((station) => station.id));
		}
		return stationIds;
	}
}
