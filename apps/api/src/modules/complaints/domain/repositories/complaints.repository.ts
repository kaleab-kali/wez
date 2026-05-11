import type { Complaint, ComplaintFilter, ComplaintPatch, NewComplaint } from "../entities/complaint.entity";

export const COMPLAINTS_REPO = Symbol("COMPLAINTS_REPO");

export interface IComplaintsRepository {
	findById(id: string): Promise<Complaint | null>;
	create(data: NewComplaint): Promise<Complaint>;
	update(id: string, patch: ComplaintPatch): Promise<Complaint>;
	listByFilter(filter: ComplaintFilter): Promise<{ items: Complaint[]; total: number }>;
}
