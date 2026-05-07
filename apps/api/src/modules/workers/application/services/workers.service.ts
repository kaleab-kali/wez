import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { auth } from "#modules/auth/auth.config";
import type { IRoleCatalogRepository } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import { ROLE_CATALOG_REPO } from "#modules/role-catalog/domain/repositories/role-catalog.repository";
import type { IStationsRepository } from "#modules/stations/domain/repositories/stations.repository";
import { STATIONS_REPO } from "#modules/stations/domain/repositories/stations.repository";
import { PrismaService } from "#shared/database/prisma.service";
import { type IWorkersRepository, WORKERS_REPO } from "../../domain/repositories/workers.repository";
import type { ListWorkersDto, RegisterWorkerDto, UpdateWorkerDto } from "../dto/worker.dto";

const WORKER_ROLE = "worker";

@Injectable()
export class WorkersService {
	constructor(
		@Inject(WORKERS_REPO) private readonly repo: IWorkersRepository,
		@Inject(ROLE_CATALOG_REPO) private readonly roles: IRoleCatalogRepository,
		@Inject(STATIONS_REPO) private readonly stations: IStationsRepository,
		private readonly prisma: PrismaService,
	) {}

	async list(filter: ListWorkersDto) {
		const { items, total } = await this.repo.listByFilter(filter);
		const page = filter.page ?? 1;
		const limit = filter.limit ?? 20;
		return {
			data: items,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
		};
	}

	async getById(id: string) {
		const w = await this.repo.findById(id);
		if (!w) throw new NotFoundException({ code: "WORKER_NOT_FOUND" });
		return w;
	}

	async register(currentAgentId: string, dto: RegisterWorkerDto) {
		const station = await this.stations.findById(dto.stationId);
		if (!station) throw new NotFoundException({ code: "STATION_NOT_FOUND" });
		const hasEmailLogin = !!dto.loginEmail || !!dto.loginPassword;
		if (hasEmailLogin && (!dto.loginEmail || !dto.loginPassword)) {
			throw new BadRequestException({ code: "WORKER_LOGIN_EMAIL_PASSWORD_REQUIRED" });
		}

		const fayda = await this.repo.findByFayda(dto.fayda);
		if (fayda) throw new ConflictException({ code: "FAYDA_TAKEN", details: { existingWorkerId: fayda.id } });

		const phone = await this.repo.findByPhone(dto.phone);
		if (phone) throw new ConflictException({ code: "PHONE_TAKEN", details: { existingWorkerId: phone.id } });

		for (const roleId of dto.roles) {
			const r = await this.roles.findById(roleId);
			if (!r?.active) throw new ConflictException({ code: "INVALID_ROLE", details: { roleId } });
		}

		const userId = dto.loginEmail ? await this.createWorkerLogin(dto) : null;

		return this.repo.create({
			userId,
			fullName: dto.fullName,
			fayda: dto.fayda,
			phone: dto.phone,
			dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
			gender: dto.gender,
			area: dto.area,
			bio: dto.bio ?? null,
			religion: dto.religion ?? null,
			languages: dto.languages,
			experienceYears: dto.experienceYears,
			hasHealthCard: dto.hasHealthCard,
			hasPoliceClearance: dto.hasPoliceClearance,
			tin: dto.tin ?? null,
			registeredByAgentId: currentAgentId,
			registeredAtStationId: dto.stationId,
			roles: dto.roles,
		});
	}

	private async createWorkerLogin(dto: RegisterWorkerDto) {
		if (!dto.loginEmail || !dto.loginPassword) return null;
		const existingUser = await this.prisma.user.findFirst({
			where: { OR: [{ email: dto.loginEmail }, { phoneNumber: dto.phone }] },
			select: { id: true, email: true, phoneNumber: true },
		});
		if (existingUser) {
			throw new ConflictException({
				code: "WORKER_LOGIN_TAKEN",
				details: { existingUserId: existingUser.id },
			});
		}

		const { user } = await auth.api.signUpEmail({
			body: {
				name: dto.fullName,
				email: dto.loginEmail,
				password: dto.loginPassword,
			},
		});
		await this.prisma.user.update({
			where: { id: user.id },
			data: { role: WORKER_ROLE, phoneNumber: dto.phone },
		});
		return user.id;
	}

	async update(id: string, dto: UpdateWorkerDto) {
		await this.getById(id);
		if (dto.roles) {
			for (const roleId of dto.roles) {
				const r = await this.roles.findById(roleId);
				if (!r?.active) throw new ConflictException({ code: "INVALID_ROLE", details: { roleId } });
			}
		}
		return this.repo.update(id, {
			fullName: dto.fullName,
			bio: dto.bio,
			religion: dto.religion,
			languages: dto.languages,
			experienceYears: dto.experienceYears,
			hasHealthCard: dto.hasHealthCard,
			hasPoliceClearance: dto.hasPoliceClearance,
			tier: dto.tier,
			hopFlag: dto.hopFlag,
			available: dto.available,
			tin: dto.tin,
			roles: dto.roles,
		});
	}
}
