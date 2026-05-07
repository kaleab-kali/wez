import { ConflictException, Injectable } from "@nestjs/common";

type AgreementSnapshot = {
	readonly workerUpdatedAt: Date;
	readonly employerUpdatedAt: Date;
	readonly roleUpdatedAt: Date;
	readonly stationUpdatedAt: Date;
};

@Injectable()
export class PlacementAgreementSnapshotService {
	assertCurrent(before: AgreementSnapshot, current: AgreementSnapshot) {
		if (
			this.changed(before.workerUpdatedAt, current.workerUpdatedAt) ||
			this.changed(before.employerUpdatedAt, current.employerUpdatedAt) ||
			this.changed(before.roleUpdatedAt, current.roleUpdatedAt) ||
			this.changed(before.stationUpdatedAt, current.stationUpdatedAt)
		) {
			throw new ConflictException({ code: "PLACEMENT_SNAPSHOT_CHANGED_RETRY" });
		}
	}

	private changed(left: Date, right: Date): boolean {
		return left.getTime() !== right.getTime();
	}
}
