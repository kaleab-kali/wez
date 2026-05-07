import type { Employer, EmployerFilter, EmployerPatch, NewEmployer } from "../entities/employer.entity";

export const EMPLOYERS_REPO = Symbol("EMPLOYERS_REPO");

export interface IEmployersRepository {
	findById(id: string): Promise<Employer | null>;
	findByUserId(userId: string): Promise<Employer | null>;
	findByTin(tin: string): Promise<Employer | null>;
	findByPhone(phone: string): Promise<Employer | null>;
	create(data: NewEmployer): Promise<Employer>;
	update(id: string, patch: EmployerPatch): Promise<Employer>;
	listByFilter(filter: EmployerFilter): Promise<{ items: Employer[]; total: number }>;
	softDelete(id: string): Promise<void>;
}
