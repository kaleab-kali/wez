export type EmployerType = "business" | "household";
export type EmployerRating = "green" | "yellow" | "orange" | "red";

export interface Employer {
	id: string;
	userId: string | null;
	type: EmployerType;
	name: string;
	contactName: string | null;
	phone: string;
	email: string | null;
	area: string;
	tin: string | null;
	businessLicense: string | null;
	fayda: string | null;
	rating: EmployerRating;
	placementsCount: number;
	complaintsCount: number;
	registeredByAgentId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface NewEmployer {
	userId: string | null;
	type: EmployerType;
	name: string;
	contactName: string | null;
	phone: string;
	email: string | null;
	area: string;
	tin: string | null;
	businessLicense: string | null;
	fayda: string | null;
	registeredByAgentId: string | null;
}

export type EmployerPatch = Partial<{
	name: string;
	contactName: string;
	phone: string;
	email: string;
	area: string;
	tin: string;
	businessLicense: string;
	fayda: string;
	rating: EmployerRating;
}>;

export interface EmployerFilter {
	q?: string;
	type?: EmployerType;
	rating?: EmployerRating;
	area?: string;
	page?: number;
	limit?: number;
}
