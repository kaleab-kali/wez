import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { EMPLOYERS_REPO, type IEmployersRepository } from "../../domain/repositories/employers.repository";
import type { CreateEmployerDto, ListEmployersDto, UpdateEmployerDto } from "../dto/employer.dto";

@Injectable()
export class EmployersService {
	constructor(
		@Inject(EMPLOYERS_REPO) private readonly repo: IEmployersRepository,
		private readonly prisma: PrismaService,
	) {}

	async list(filter: ListEmployersDto) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async getById(id: string) {
		const e = await this.repo.findById(id);
		if (!e) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
		return e;
	}

	async getMine(userId: string) {
		return this.repo.findByUserId(userId);
	}

	async create(currentUserId: string, dto: CreateEmployerDto, asAgent: boolean) {
		if (dto.type === "business") {
			if (!dto.tin) throw new BadRequestException({ code: "TIN_REQUIRED" });
			if (!dto.businessLicense) throw new BadRequestException({ code: "LICENSE_REQUIRED" });
			if (!dto.businessLicenseExpiresAt) throw new BadRequestException({ code: "LICENSE_EXPIRY_REQUIRED" });
			if (new Date(dto.businessLicenseExpiresAt).getTime() <= Date.now()) {
				throw new BadRequestException({ code: "LICENSE_EXPIRED" });
			}
			const t = await this.repo.findByTin(dto.tin);
			if (t) throw new ConflictException({ code: "TIN_TAKEN" });
		} else {
			if (!dto.fayda) throw new BadRequestException({ code: "FAYDA_REQUIRED" });
		}
		const phoneTaken = await this.repo.findByPhone(dto.phone);
		if (phoneTaken) throw new ConflictException({ code: "PHONE_TAKEN" });

		const employer = await this.repo.create({
			userId: asAgent ? null : currentUserId,
			type: dto.type,
			name: dto.name,
			contactName: dto.contactName ?? null,
			phone: dto.phone,
			email: dto.email ?? null,
			area: dto.area,
			tin: dto.tin ?? null,
			businessLicense: dto.businessLicense ?? null,
			businessLicenseExpiresAt: dto.businessLicenseExpiresAt ? new Date(dto.businessLicenseExpiresAt) : null,
			businessAddress: dto.businessAddress ?? null,
			businessCategory: dto.businessCategory ?? null,
			fayda: dto.fayda ?? null,
			secondaryContact: dto.secondaryContact ?? null,
			registeredByAgentId: asAgent ? currentUserId : null,
		});

		if (!asAgent) {
			await this.prisma.user.update({
				where: { id: currentUserId },
				data: { role: dto.type === "business" ? "employer_business" : "employer_household" },
			});
		}

		return employer;
	}

	async update(id: string, dto: UpdateEmployerDto) {
		await this.getById(id);
		const patch = {
			...dto,
			businessLicenseExpiresAt: dto.businessLicenseExpiresAt ? new Date(dto.businessLicenseExpiresAt) : undefined,
		};
		return this.repo.update(id, patch);
	}
}
