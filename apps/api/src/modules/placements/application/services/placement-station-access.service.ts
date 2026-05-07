import { ForbiddenException, Injectable } from "@nestjs/common";
import type { WezSession } from "#shared/auth/session";
import { PrismaService } from "#shared/database/prisma.service";
import { PlacementsRepository } from "../../infrastructure/repositories/placements.repository";

const STATION_SCOPED_ROLES = ["agent", "station_supervisor"] as const;

@Injectable()
export class PlacementStationAccessService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly placements: PlacementsRepository,
	) {}

	isStationScopedRole(role: string | null | undefined): boolean {
		return STATION_SCOPED_ROLES.includes((role ?? "") as (typeof STATION_SCOPED_ROLES)[number]);
	}

	async stationIdsForSession(session: WezSession): Promise<string[]> {
		if (session.user.role === "agent") return this.placements.activeAgentStationIds(session.user.id);
		if (session.user.role === "station_supervisor") return this.placements.supervisedStationIds(session.user.id);
		return [];
	}

	async assertAccess(session: WezSession, stationId: string) {
		if (session.kind !== "staff") {
			throw new ForbiddenException({ code: "STAFF_SESSION_REQUIRED" });
		}
		const role = session.user.role ?? "";
		if (!this.isStationScopedRole(role)) return;
		if (role === "agent") {
			const assignment = await this.prisma.agentAssignment.findFirst({
				where: { userId: session.user.id, stationId, active: true, removedAt: null },
				select: { id: true },
			});
			if (!assignment) throw new ForbiddenException({ code: "NOT_YOUR_STATION" });
			return;
		}
		const station = await this.prisma.station.findFirst({
			where: { id: stationId, supervisorUserId: session.user.id },
			select: { id: true },
		});
		if (!station) throw new ForbiddenException({ code: "NOT_YOUR_STATION" });
	}
}
