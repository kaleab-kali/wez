export type CommType = "flat" | "percent";

export interface RoleCatalogEntry {
	id: string;
	name: string;
	category: string;
	commType: CommType;
	commValue: number; // birr (flat) or % * 1 (percent — e.g., 10 == 10%)
	salaryMinCents: bigint;
	salaryMaxCents: bigint;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export type NewRole = Omit<RoleCatalogEntry, "createdAt" | "updatedAt">;
export type RolePatch = Partial<Omit<RoleCatalogEntry, "id" | "createdAt" | "updatedAt">>;
