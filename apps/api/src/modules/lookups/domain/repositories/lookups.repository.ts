import type { Lookup, LookupPatch, NewLookup } from "../entities/lookup.entity";

export const LOOKUPS_REPO = Symbol("LOOKUPS_REPO");

export interface ILookupsRepository {
	findById(id: string): Promise<Lookup | null>;
	listByKind(kind: string, includeArchived?: boolean): Promise<Lookup[]>;
	listAll(includeArchived?: boolean): Promise<Lookup[]>;
	create(data: NewLookup): Promise<Lookup>;
	update(id: string, patch: LookupPatch): Promise<Lookup>;
}
