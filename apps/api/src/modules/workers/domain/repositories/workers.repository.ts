import type { NewWorker, Worker, WorkerFilter, WorkerPatch } from "../entities/worker.entity";

export const WORKERS_REPO = Symbol("WORKERS_REPO");

export interface IWorkersRepository {
	findById(id: string): Promise<Worker | null>;
	findByUserId(userId: string): Promise<Worker | null>;
	findByFayda(fayda: string): Promise<Worker | null>;
	findByPhone(phone: string): Promise<Worker | null>;
	create(data: NewWorker): Promise<Worker>;
	update(id: string, patch: WorkerPatch): Promise<Worker>;
	listByFilter(filter: WorkerFilter): Promise<{ items: Worker[]; total: number }>;
	softDelete(id: string): Promise<void>;
}
