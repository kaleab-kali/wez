import { ForbiddenException, Injectable } from "@nestjs/common";
import type { WezSession } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";

const STATION_SCOPED_ROLES = ["agent", "station_supervisor"] as const;
const PLACEMENT_GLOBAL_ACCESS_ROLES = ["super_admin", "ops_manager", "finance_manager", "compliance_officer"] as const;

@Injectable()
export class PlacementStationAccessService {
	constructor(private readonly staffAccess: StaffAccessService) {}

	isStationScopedRole(role: string | null | undefined): boolean {
		return STATION_SCOPED_ROLES.includes((role ?? "") as (typeof STATION_SCOPED_ROLES)[number]);
	}

	isStationScopedSession(session: WezSession): boolean {
		return (
			this.staffAccess.isStationScoped(session) && !this.staffAccess.hasAnyRole(session, PLACEMENT_GLOBAL_ACCESS_ROLES)
		);
	}

	async stationIdsForSession(session: WezSession): Promise<string[]> {
		return this.staffAccess.stationIdsForSession(session);
	}

	async assertAccess(session: WezSession, stationId: string) {
		if (session.kind !== "staff") {
			throw new ForbiddenException({ code: "STAFF_SESSION_REQUIRED" });
		}
		await this.staffAccess.assertStationAccess(session, stationId, PLACEMENT_GLOBAL_ACCESS_ROLES);
	}
}
