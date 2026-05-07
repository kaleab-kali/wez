import { ForbiddenException, Injectable } from "@nestjs/common";
import type { WezAdminRole } from "#modules/auth/permissions";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";

const STATION_SCOPED_ROLES = ["agent", "station_supervisor"] as const satisfies readonly WezAdminRole[];

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
				where: { supervisorUserId: session.user.id },
				select: { id: true },
			});
			stationIds.push(...stations.map((station) => station.id));
		}

		return Array.from(new Set(stationIds));
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
		if (!this.isStationScoped(session)) throw new ForbiddenException({ code: "STATION_SCOPE_REQUIRED" });

		const stationIds = await this.stationIdsForSession(session);
		if (!stationIds.includes(stationId)) throw new ForbiddenException({ code: "NOT_YOUR_STATION" });
	}
}
