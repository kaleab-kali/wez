const API_BASE = "/api/v1";

interface RequestConfig extends RequestInit {
	params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(url: string, config: RequestConfig = {}): Promise<T> {
	const { params, ...fetchConfig } = config;

	let fullUrl = `${API_BASE}${url}`;

	if (params) {
		const searchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) searchParams.append(key, String(value));
		}
		const queryString = searchParams.toString();
		if (queryString) fullUrl += `?${queryString}`;
	}

	const response = await fetch(fullUrl, {
		...fetchConfig,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...fetchConfig.headers,
		},
	});

	if (!response.ok) {
		const errorBody = await response.json().catch(() => ({}));
		throw new ApiError(response.status, errorBody?.error?.message || "Request failed", errorBody?.error?.code);
	}

	return response.json();
}

export class ApiError extends Error {
	readonly status: number;
	readonly code?: string;
	constructor(status: number, message: string, code?: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}
}

export const api = {
	get: <T>(url: string, config?: RequestConfig) => request<T>(url, { ...config, method: "GET" }),
	post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
		request<T>(url, { ...config, method: "POST", body: JSON.stringify(data) }),
	put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
		request<T>(url, { ...config, method: "PUT", body: JSON.stringify(data) }),
	patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
		request<T>(url, { ...config, method: "PATCH", body: JSON.stringify(data) }),
	delete: <T>(url: string, config?: RequestConfig) => request<T>(url, { ...config, method: "DELETE" }),
};
