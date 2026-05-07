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
		this.assertType(dto.kind, dto.type);
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
		const current = await this.get(id);
		const nextKind = dto.kind ?? current.kind;
		const nextParentId = dto.parentId ?? current.parentId ?? undefined;
		const nextType = dto.type ?? current.type;
		await this.assertParent(nextKind, nextParentId);
		this.assertType(nextKind, nextType);
		if (dto.code && dto.code !== current.code) {
			const existing = await this.prisma.location.findUnique({ where: { code: dto.code }, select: { id: true } });
			if (existing) throw new ConflictException({ code: "LOCATION_CODE_EXISTS" });
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
		const activeChild = await this.prisma.location.findFirst({
			where: { parentId: id, active: true, deletedAt: null },
			select: { id: true },
		});
		if (activeChild) throw new ConflictException({ code: "LOCATION_HAS_ACTIVE_CHILDREN" });
		const station = await this.prisma.station.findFirst({
			where: { localityId: id },
			select: { id: true },
		});
		if (station) throw new ConflictException({ code: "LOCATION_IN_USE_BY_STATION" });
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

	private assertType(kind: string, type: string) {
		const typeByKind: Record<string, readonly string[]> = {
			admin_area: ["city_administration", "region"],
			sub_area: ["subcity", "zone"],
			locality: ["woreda", "kebele", "custom"],
		};
		if (!typeByKind[kind]?.includes(type)) {
			throw new BadRequestException({ code: "LOCATION_TYPE_DOES_NOT_MATCH_KIND" });
		}
	}
}
