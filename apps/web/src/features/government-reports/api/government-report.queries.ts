import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type GovernmentReportType = "erca_monthly" | "mols_quarterly";
export type GovernmentReportStatus = "pending" | "ready" | "filed" | "error";
export type GovernmentReportFormat = "csv";

export type GovernmentReport = {
	readonly id: string;
	readonly type: GovernmentReportType;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly format: GovernmentReportFormat;
	readonly fileUrl: string | null;
	readonly filedAt: string | null;
	readonly filedReference: string | null;
	readonly generatedById: string;
	readonly status: GovernmentReportStatus;
	readonly errorMessage: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
};

export type GovernmentReportListFilter = {
	readonly type?: GovernmentReportType;
	readonly status?: GovernmentReportStatus;
	readonly periodStart?: string;
	readonly periodEnd?: string;
	readonly page?: number;
	readonly limit?: number;
};

export type GovernmentReportPeriodFilter = {
	readonly periodStart: string;
	readonly periodEnd: string;
};

export type GenerateGovernmentReportInput = GovernmentReportPeriodFilter & {
	readonly type: GovernmentReportType;
	readonly format?: GovernmentReportFormat;
};

export type MarkGovernmentReportFiledInput = {
	readonly id: string;
	readonly filedReference: string;
};

export type GovernmentReportSummary = {
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly money: {
		readonly commissionCents: string;
		readonly wagesCents: string;
	};
	readonly counts: {
		readonly placementsStarted: number;
		readonly commissionPayments: number;
		readonly uniqueWorkers: number;
		readonly uniqueEmployers: number;
		readonly complaintsFiled: number;
		readonly complaintsResolved: number;
		readonly complaintsEscalated: number;
		readonly trainingCompletions: number;
	};
	readonly exceptions: {
		readonly workersMissingTin: number;
		readonly businessEmployersMissingTin: number;
		readonly householdEmployersMissingFayda: number;
		readonly commissionPaymentsMissingReference: number;
	};
	readonly distributions: {
		readonly employerTypes: readonly { readonly key: string; readonly count: number }[];
		readonly workerTiers: readonly { readonly key: string; readonly count: number }[];
		readonly roleCategories: readonly { readonly key: string; readonly count: number }[];
	};
};

type ListResponse = {
	readonly data: GovernmentReport[];
	readonly meta: {
		readonly total: number;
		readonly page: number;
		readonly limit: number;
		readonly totalPages: number;
	};
};

export const governmentReportKeys = {
	all: ["government-reports"] as const,
	lists: () => [...governmentReportKeys.all, "list"] as const,
	list: (filter: GovernmentReportListFilter) => [...governmentReportKeys.lists(), filter] as const,
	summary: (filter: GovernmentReportPeriodFilter) => [...governmentReportKeys.all, "summary", filter] as const,
};

export const useGovernmentReports = (filter: GovernmentReportListFilter) =>
	useQuery({
		queryKey: governmentReportKeys.list(filter),
		queryFn: () => api.get<ListResponse>("/government-reports", { params: filter }),
	});

export const useGovernmentReportSummary = (filter: GovernmentReportPeriodFilter) =>
	useQuery({
		queryKey: governmentReportKeys.summary(filter),
		queryFn: async () => {
			const response = await api.get<{ data: GovernmentReportSummary }>("/government-reports/summary", {
				params: filter,
			});
			return response.data;
		},
		enabled: Boolean(filter.periodStart && filter.periodEnd),
	});

export const useGenerateGovernmentReport = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: GenerateGovernmentReportInput) => {
			const response = await api.post<{ data: GovernmentReport }>("/government-reports/generate", input);
			return response.data;
		},
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: governmentReportKeys.lists() });
		},
	});
};

export const useMarkGovernmentReportFiled = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: MarkGovernmentReportFiledInput) => {
			const response = await api.post<{ data: GovernmentReport }>(`/government-reports/${input.id}/filed`, {
				filedReference: input.filedReference,
			});
			return response.data;
		},
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: governmentReportKeys.lists() });
		},
	});
};
