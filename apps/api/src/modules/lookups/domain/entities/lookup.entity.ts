export interface Lookup {
	id: string;
	kind: string;
	value: string;
	labelEn: string;
	labelAm: string | null;
	sortOrder: number;
	archived: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export type NewLookup = Omit<Lookup, "id" | "createdAt" | "updatedAt">;
export type LookupPatch = Partial<Omit<Lookup, "id" | "kind" | "value" | "createdAt" | "updatedAt">>;

// Built-in kinds. HQ can add custom ones.
export const LOOKUP_KINDS = ["languages", "woredas", "religions"] as const;
export type LookupKind = (typeof LOOKUP_KINDS)[number] | string;
