import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/employers";

const get = async <T>(url: string): Promise<T> => {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

const send = async <T>(url: string, method: string, body?: unknown): Promise<T> => {
	const res = await fetch(url, {
		method,
		credentials: "include",
		headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const errBody = await res.json().catch(() => ({}));
		throw new Error(errBody?.error?.message ?? `Request failed: ${res.status}`);
	}
	return res.json();
};

export type Employer = {
	id: string;
	type: "business" | "household";
	name: string;
	contactName: string | null;
	phone: string;
	email: string | null;
	area: string;
	tin: string | null;
	businessLicense: string | null;
	businessLicenseExpiresAt: string | null;
	businessAddress: string | null;
	businessCategory: string | null;
	fayda: string | null;
	secondaryContact: string | null;
	rating: "green" | "yellow" | "orange" | "red";
	placementsCount: number;
	complaintsCount: number;
	createdAt: string;
	updatedAt: string;
};

export type EmployerFilter = {
	q?: string;
	type?: Employer["type"];
	rating?: Employer["rating"];
	area?: string;
	page?: number;
	limit?: number;
};

export const employerKeys = {
	all: ["employers"] as const,
	list: (f: EmployerFilter) => [...employerKeys.all, "list", f] as const,
	detail: (id: string) => [...employerKeys.all, "detail", id] as const,
	mine: () => [...employerKeys.all, "mine"] as const,
};

const qs = (filter: EmployerFilter) => {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(filter)) {
		if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
	}
	return p.toString();
};

export const useEmployers = (filter: EmployerFilter) =>
	useQuery({
		queryKey: employerKeys.list(filter),
		queryFn: () =>
			get<{ data: Employer[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
				`${BASE}?${qs(filter)}`,
			),
	});

export const useEmployer = (id: string | undefined) =>
	useQuery({
		queryKey: id ? employerKeys.detail(id) : ["employers", "detail", "none"],
		queryFn: () => get<{ data: Employer }>(`${BASE}/${id}`).then((b) => b.data),
		enabled: !!id,
	});

export const useMyEmployer = (options?: { readonly enabled?: boolean }) =>
	useQuery({
		queryKey: employerKeys.mine(),
		queryFn: () => get<{ data: Employer | null }>(`${BASE}/me`).then((b) => b.data),
		enabled: options?.enabled ?? true,
	});

export const useCreateEmployer = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: {
			type: "business" | "household";
			name: string;
			contactName?: string;
			phone: string;
			email?: string;
			area: string;
			tin?: string;
			businessLicense?: string;
			businessLicenseExpiresAt?: string;
			businessAddress?: string;
			businessCategory?: string;
			fayda?: string;
			secondaryContact?: string;
		}) => send<{ data: Employer }>(BASE, "POST", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: employerKeys.all }),
	});
};
