import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Lookup, LookupPatch, NewLookup } from "../../domain/entities/lookup.entity";
import type { ILookupsRepository } from "../../domain/repositories/lookups.repository";

const toLookup = (row: {
	id: string;
	kind: string;
	value: string;
	labelEn: string;
	labelAm: string | null;
	sortOrder: number;
	archived: boolean;
	createdAt: Date;
	updatedAt: Date;
}): Lookup => ({
	id: row.id,
	kind: row.kind,
	value: row.value,
	labelEn: row.labelEn,
	labelAm: row.labelAm,
	sortOrder: row.sortOrder,
	archived: row.archived,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaLookupsRepository implements ILookupsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.lookup.findUnique({ where: { id } });
		return row ? toLookup(row) : null;
	}

	async listByKind(kind: string, includeArchived = false) {
		const rows = await this.prisma.lookup.findMany({
			where: { kind, ...(includeArchived ? {} : { archived: false }) },
			orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
		});
		return rows.map(toLookup);
	}

	async listAll(includeArchived = false) {
		const rows = await this.prisma.lookup.findMany({
			where: includeArchived ? {} : { archived: false },
			orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
		});
		return rows.map(toLookup);
	}

	async create(data: NewLookup) {
		const row = await this.prisma.lookup.create({ data });
		return toLookup(row);
	}

	async update(id: string, patch: LookupPatch) {
		const row = await this.prisma.lookup.update({ where: { id }, data: patch });
		return toLookup(row);
	}
}
