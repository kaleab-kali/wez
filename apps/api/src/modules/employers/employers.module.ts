import { Module } from "@nestjs/common";
import { StaffAccessService } from "#shared/auth/staff-access.service";
import { EmployersService } from "./application/services/employers.service";
import { EMPLOYERS_REPO } from "./domain/repositories/employers.repository";
import { PrismaEmployersRepository } from "./infrastructure/repositories/prisma-employers.repository";
import { EmployersController } from "./presentation/controllers/employers.controller";

@Module({
	controllers: [EmployersController],
	providers: [EmployersService, StaffAccessService, { provide: EMPLOYERS_REPO, useClass: PrismaEmployersRepository }],
	exports: [EmployersService, { provide: EMPLOYERS_REPO, useClass: PrismaEmployersRepository }],
})
export class EmployersModule {}
