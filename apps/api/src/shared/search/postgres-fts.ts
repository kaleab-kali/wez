const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UNRANKED_ORDER = Number.MAX_SAFE_INTEGER;

export type RankedId = {
	readonly id: string;
	readonly rank: number;
};

export type PageWindow = {
	readonly page: number;
	readonly limit: number;
	readonly skip: number;
};

export const normalizeSearchQuery = (value: string | undefined): string | null => {
	const query = value?.trim();
	return query && query.length > 0 ? query : null;
};

export const pageWindow = (page: number | undefined, limit: number | undefined): PageWindow => {
	const safePage = Math.max(DEFAULT_PAGE, page ?? DEFAULT_PAGE);
	const safeLimit = Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_LIMIT);
	return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

export const intersectRankedIds = (
	rankedIds: readonly RankedId[],
	matchingIds: readonly { readonly id: string }[],
): readonly string[] => {
	const matching = new Set(matchingIds.map((row) => row.id));
	return rankedIds.map((row) => row.id).filter((id) => matching.has(id));
};

export const orderRowsByIdList = <T extends { readonly id: string }>(
	rows: readonly T[],
	orderedIds: readonly string[],
): readonly T[] => {
	const order = new Map(orderedIds.map((id, index) => [id, index]));
	return Array.from(rows).sort((left, right) => {
		const leftOrder = order.get(left.id) ?? UNRANKED_ORDER;
		const rightOrder = order.get(right.id) ?? UNRANKED_ORDER;
		return leftOrder - rightOrder;
	});
};
