import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/v1/platform-settings";

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

export type HiringPolicy = {
	hireRequestExpiryDays: number;
};

export const platformSettingsKeys = {
	all: ["platform-settings"] as const,
	hiringPolicy: () => [...platformSettingsKeys.all, "hiring-policy"] as const,
};

export const useHiringPolicy = () =>
	useQuery({
		queryKey: platformSettingsKeys.hiringPolicy(),
		queryFn: () => get<{ data: HiringPolicy }>(`${BASE}/hiring-policy`).then((b) => b.data),
	});

export const useUpdateHiringPolicy = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: HiringPolicy) =>
			send<{ data: HiringPolicy }>(`${BASE}/hiring-policy`, "PATCH", input).then((b) => b.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: platformSettingsKeys.all }),
	});
};
