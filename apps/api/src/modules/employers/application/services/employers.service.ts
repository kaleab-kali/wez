import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { auth } from "#modules/auth/auth.config";
import type { WezSession } from "#shared/auth/session";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { PrismaService } from "#shared/database/prisma.service";
import type { EmployerFilter } from "../../domain/entities/employer.entity";
import { EMPLOYERS_REPO, type IEmployersRepository } from "../../domain/repositories/employers.repository";
import type { CreateEmployerDto, ListEmployersDto, SignupEmployerDto, UpdateEmployerDto } from "../dto/employer.dto";

const EMPLOYER_ROLES = {
	business: "employer_business",
	household: "employer_household",
} as const;
const EMPLOYER_GLOBAL_ACCESS_ROLES = ["super_admin", "ops_manager", "hr_manager"] as const;

@Injectable()
export class EmployersService {
	constructor(
		@Inject(EMPLOYERS_REPO) private readonly repo: IEmployersRepository,
		private readonly prisma: PrismaService,
		private readonly staffAccess: StaffAccessService,
	) {}

	async list(filter: ListEmployersDto | EmployerFilter) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async listForSession(session: WezSession, filter: ListEmployersDto) {
		if (session.kind !== "staff" || this.staffAccess.hasAnyRole(session, EMPLOYER_GLOBAL_ACCESS_ROLES)) {
			return this.list(filter);
		}
		const agentIds = await this.staffAccess.agentIdsForSession(session);
		return this.list({ ...filter, registeredByAgentIds: agentIds });
	}

	async getById(id: string) {
		const e = await this.repo.findById(id);
		if (!e) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
		return e;
	}

	async getByIdForSession(session: WezSession, id: string) {
		const employer = await this.getById(id);
		if (
			session.kind === "staff" &&
			!this.staffAccess.hasAnyRole(session, EMPLOYER_GLOBAL_ACCESS_ROLES) &&
			employer.registeredByAgentId
		) {
			const agentIds = await this.staffAccess.agentIdsForSession(session);
			if (!agentIds.includes(employer.registeredByAgentId)) throw new NotFoundException({ code: "EMPLOYER_NOT_FOUND" });
		}
		return employer;
	}

	async getMine(userId: string) {
		return this.repo.findByUserId(userId);
	}

	async create(currentUserId: string, dto: CreateEmployerDto, asAgent: boolean) {
		await this.validateCreate(dto);
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
				data: { role: EMPLOYER_ROLES[dto.type] },
			});
		}

		return employer;
	}

	async signup(dto: SignupEmployerDto) {
		await this.validateCreate(dto);
		const existingUser = await this.prisma.user.findFirst({
			where: { OR: [{ email: dto.loginEmail }, { phoneNumber: dto.phone }] },
			select: { id: true },
		});
		if (existingUser) throw new ConflictException({ code: "EMPLOYER_LOGIN_TAKEN" });

		const { user } = await auth.api.signUpEmail({
			body: {
				name: dto.contactName || dto.name,
				email: dto.loginEmail,
				password: dto.loginPassword,
			},
		});

		try {
			await this.prisma.user.update({
				where: { id: user.id },
				data: { role: EMPLOYER_ROLES[dto.type], phoneNumber: dto.phone },
			});
			return await this.repo.create({
				userId: user.id,
				type: dto.type,
				name: dto.name,
				contactName: dto.contactName ?? null,
				phone: dto.phone,
				email: dto.email ?? dto.loginEmail,
				area: dto.area,
				tin: dto.tin ?? null,
				businessLicense: dto.businessLicense ?? null,
				businessLicenseExpiresAt: dto.businessLicenseExpiresAt ? new Date(dto.businessLicenseExpiresAt) : null,
				businessAddress: dto.businessAddress ?? null,
				businessCategory: dto.businessCategory ?? null,
				fayda: dto.fayda ?? null,
				secondaryContact: dto.secondaryContact ?? null,
				registeredByAgentId: null,
			});
		} catch (err) {
			await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
			throw err;
		}
	}

	private async validateCreate(dto: CreateEmployerDto) {
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
