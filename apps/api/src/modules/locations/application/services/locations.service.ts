import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { CreateLocationDto, UpdateLocationDto } from "../dto/location.dto";

@Injectable()
export class LocationsService {
	constructor(private readonly prisma: PrismaService) {}

	async list(input: { kind?: string; parentId?: string; includeInactive?: boolean }) {
		return this.prisma.location.findMany({
			where: {
				kind: input.kind,
				parentId: input.parentId,
				active: input.includeInactive ? undefined : true,
				deletedAt: null,
			},
			orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
		});
	}

	async create(dto: CreateLocationDto) {
		await this.assertParent(dto.kind, dto.parentId);
		const existing = await this.prisma.location.findUnique({ where: { code: dto.code } });
		if (existing) throw new ConflictException({ code: "LOCATION_CODE_EXISTS" });
		return this.prisma.location.create({
			data: {
				code: dto.code,
				kind: dto.kind,
				type: dto.type,
				nameEn: dto.nameEn,
				nameAm: dto.nameAm,
				parentId: dto.parentId,
				sortOrder: dto.sortOrder ?? 0,
			},
		});
	}

	async update(id: string, dto: UpdateLocationDto) {
		await this.get(id);
		if (dto.kind || dto.parentId) {
			await this.assertParent(dto.kind, dto.parentId);
		}
		return this.prisma.location.update({
			where: { id },
			data: {
				code: dto.code,
				kind: dto.kind,
				type: dto.type,
				nameEn: dto.nameEn,
				nameAm: dto.nameAm,
				parentId: dto.parentId,
				sortOrder: dto.sortOrder,
				active: dto.active,
			},
		});
	}

	async deactivate(id: string) {
		await this.get(id);
		return this.prisma.location.update({
			where: { id },
			data: { active: false, deletedAt: new Date() },
		});
	}

	private async get(id: string) {
		const location = await this.prisma.location.findUnique({ where: { id } });
		if (!location || location.deletedAt) throw new NotFoundException({ code: "LOCATION_NOT_FOUND" });
		return location;
	}

	private async assertParent(kind: string | undefined, parentId: string | undefined) {
		if (kind === "admin_area" && parentId) throw new BadRequestException({ code: "ADMIN_AREA_HAS_NO_PARENT" });
		if (kind !== "admin_area" && !parentId) throw new BadRequestException({ code: "LOCATION_PARENT_REQUIRED" });
		if (!parentId) return;
		const parent = await this.get(parentId);
		if (kind === "sub_area" && parent.kind !== "admin_area") {
			throw new BadRequestException({ code: "SUB_AREA_PARENT_MUST_BE_ADMIN_AREA" });
		}
		if (kind === "locality" && parent.kind !== "sub_area") {
			throw new BadRequestException({ code: "LOCALITY_PARENT_MUST_BE_SUB_AREA" });
		}
	}
}
