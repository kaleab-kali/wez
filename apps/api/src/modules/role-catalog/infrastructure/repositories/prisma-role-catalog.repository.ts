import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type {
	CommType,
	NewRole,
	RoleCatalogEntry,
	RolePatch,
} from "../../domain/entities/role.entity";
import type { IRoleCatalogRepository } from "../../domain/repositories/role-catalog.repository";

const toRole = (row: {
	id: string;
	name: string;
	category: string;
	commType: string;
	commValue: number;
	salaryMinCents: bigint;
	salaryMaxCents: bigint;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}): RoleCatalogEntry => ({
	id: row.id,
	name: row.name,
	category: row.category,
	commType: row.commType as CommType,
	commValue: row.commValue,
	salaryMinCents: row.salaryMinCents,
	salaryMaxCents: row.salaryMaxCents,
	active: row.active,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaRoleCatalogRepository implements IRoleCatalogRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.role.findUnique({ where: { id } });
		return row ? toRole(row) : null;
	}

	async listAll(includeInactive = false) {
		const rows = await this.prisma.role.findMany({
			where: includeInactive ? {} : { active: true },
			orderBy: [{ category: "asc" }, { name: "asc" }],
		});
		return rows.map(toRole);
	}

	async create(data: NewRole) {
		const row = await this.prisma.role.create({ data });
		return toRole(row);
	}

	async update(id: string, patch: RolePatch) {
		const row = await this.prisma.role.update({ where: { id }, data: patch });
		return toRole(row);
	}
}
