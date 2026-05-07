import type { NewReferral, Referral, ReferralFilter, ReferralPatch } from "../entities/referral.entity";

export const REFERRALS_REPO = Symbol("REFERRALS_REPO");

export interface IReferralsRepository {
	findById(id: string): Promise<Referral | null>;
	create(data: NewReferral): Promise<Referral>;
	update(id: string, patch: ReferralPatch): Promise<Referral>;
	listByFilter(filter: ReferralFilter): Promise<{ items: Referral[]; total: number }>;
	listExpiringBefore(when: Date): Promise<Referral[]>;
}
