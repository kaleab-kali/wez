import type { NewRole, RoleCatalogEntry, RolePatch } from "../entities/role.entity";

export const ROLE_CATALOG_REPO = Symbol("ROLE_CATALOG_REPO");

export interface IRoleCatalogRepository {
	findById(id: string): Promise<RoleCatalogEntry | null>;
	listAll(includeInactive?: boolean): Promise<RoleCatalogEntry[]>;
	create(data: NewRole): Promise<RoleCatalogEntry>;
	update(id: string, patch: RolePatch): Promise<RoleCatalogEntry>;
}
