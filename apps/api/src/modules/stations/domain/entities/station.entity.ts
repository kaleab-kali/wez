export interface Station {
	id: string;
	name: string;
	woreda: string;
	address: string;
	phone: string | null;
	active: boolean;
	localityId: string | null;
	custom: boolean;
	customReason: string | null;
	supervisorUserId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface AgentAssignment {
	id: string;
	userId: string;
	stationId: string;
	active: boolean;
	assignedAt: Date;
	removedAt: Date | null;
}

export type NewStation = Omit<Station, "id" | "createdAt" | "updatedAt">;
export type StationPatch = Partial<
	Pick<
		Station,
		"name" | "woreda" | "address" | "phone" | "active" | "localityId" | "custom" | "customReason" | "supervisorUserId"
	>
>;
