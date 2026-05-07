import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type {
	Employer,
	EmployerFilter,
	EmployerPatch,
	EmployerRating,
	EmployerType,
	NewEmployer,
} from "../../domain/entities/employer.entity";
import type { IEmployersRepository } from "../../domain/repositories/employers.repository";

type Row = {
	id: string;
	userId: string | null;
	type: string;
	name: string;
	contactName: string | null;
	phone: string;
	email: string | null;
	area: string;
	tin: string | null;
	businessLicense: string | null;
	businessLicenseExpiresAt: Date | null;
	businessAddress: string | null;
	businessCategory: string | null;
	fayda: string | null;
	secondaryContact: string | null;
	rating: string;
	placementsCount: number;
	complaintsCount: number;
	registeredByAgentId: string | null;
	createdAt: Date;
	updatedAt: Date;
};

const toEmployer = (row: Row): Employer => ({
	id: row.id,
	userId: row.userId,
	type: row.type as EmployerType,
	name: row.name,
	contactName: row.contactName,
	phone: row.phone,
	email: row.email,
	area: row.area,
	tin: row.tin,
	businessLicense: row.businessLicense,
	businessLicenseExpiresAt: row.businessLicenseExpiresAt,
	businessAddress: row.businessAddress,
	businessCategory: row.businessCategory,
	fayda: row.fayda,
	secondaryContact: row.secondaryContact,
	rating: row.rating as EmployerRating,
	placementsCount: row.placementsCount,
	complaintsCount: row.complaintsCount,
	registeredByAgentId: row.registeredByAgentId,
	createdAt: row.createdAt,
	updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaEmployersRepository implements IEmployersRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const row = await this.prisma.employer.findFirst({ where: { id, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async findByUserId(userId: string) {
		const row = await this.prisma.employer.findFirst({ where: { userId, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async findByTin(tin: string) {
		const row = await this.prisma.employer.findFirst({ where: { tin, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async findByPhone(phone: string) {
		const row = await this.prisma.employer.findFirst({ where: { phone, deletedAt: null } });
		return row ? toEmployer(row as unknown as Row) : null;
	}

	async create(data: NewEmployer) {
		const row = await this.prisma.employer.create({
			data: {
				userId: data.userId,
				type: data.type,
				name: data.name,
				contactName: data.contactName,
				phone: data.phone,
				email: data.email,
				area: data.area,
				tin: data.tin,
				businessLicense: data.businessLicense,
				businessLicenseExpiresAt: data.businessLicenseExpiresAt,
				businessAddress: data.businessAddress,
				businessCategory: data.businessCategory,
				fayda: data.fayda,
				secondaryContact: data.secondaryContact,
				registeredByAgentId: data.registeredByAgentId,
			},
		});
		return toEmployer(row as unknown as Row);
	}

	async update(id: string, patch: EmployerPatch) {
		const row = await this.prisma.employer.update({ where: { id }, data: patch });
		return toEmployer(row as unknown as Row);
	}

	async listByFilter(filter: EmployerFilter) {
		const where: Record<string, unknown> = { deletedAt: null };
		if (filter.q) {
			where.OR = [
				{ name: { contains: filter.q, mode: "insensitive" } },
				{ contactName: { contains: filter.q, mode: "insensitive" } },
				{ phone: { contains: filter.q } },
			];
		}
		if (filter.type) where.type = filter.type;
		if (filter.rating) where.rating = filter.rating;
		if (filter.area) where.area = filter.area;

		const page = Math.max(1, filter.page ?? 1);
		const limit = Math.min(Math.max(1, filter.limit ?? 20), 100);

		const [rows, total] = await Promise.all([
			this.prisma.employer.findMany({
				where: where as never,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.employer.count({ where: where as never }),
		]);

		return { items: rows.map((r) => toEmployer(r as unknown as Row)), total };
	}

	async softDelete(id: string) {
		await this.prisma.employer.update({ where: { id }, data: { deletedAt: new Date() } });
	}
}
