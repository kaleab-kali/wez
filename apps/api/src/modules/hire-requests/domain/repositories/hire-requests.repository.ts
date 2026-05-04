import type { HireRequest, HireRequestFilter, HireRequestPatch, NewHireRequest } from "../entities/hire-request.entity";

export const HIRE_REQUESTS_REPO = Symbol("HIRE_REQUESTS_REPO");

export interface IHireRequestsRepository {
	findById(id: string): Promise<HireRequest | null>;
	create(data: NewHireRequest): Promise<HireRequest>;
	update(id: string, patch: HireRequestPatch): Promise<HireRequest>;
	listByFilter(filter: HireRequestFilter): Promise<{ items: HireRequest[]; total: number }>;
	listExpiringBefore(when: Date): Promise<HireRequest[]>;
}
