import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
	readonly columns: ColumnDef<TData, TValue>[];
	readonly data: readonly TData[];
	readonly isLoading?: boolean;
	readonly searchPlaceholder?: string;
	readonly searchKey?: keyof TData & string;
	readonly emptyMessage?: string;
	readonly pageSize?: number;
	readonly enableSearch?: boolean;
	readonly enablePagination?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
	searchPlaceholder,
	searchKey,
	emptyMessage,
	pageSize = 20,
	enableSearch = true,
	enablePagination = true,
}: DataTableProps<TData, TValue>) {
	const { t } = useTranslation();
	const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.searchDots", { defaultValue: "Search..." });
	const resolvedEmptyMessage = emptyMessage ?? t("common.noResults", { defaultValue: "No results." });
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = React.useState("");
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: pageSize,
	});

	const mutableData = React.useMemo(() => [...data], [data]);

	const table = useReactTable({
		data: mutableData,
		columns,
		state: {
			sorting,
			globalFilter,
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		globalFilterFn: searchKey
			? (row, _columnId, filterValue) => {
					const cellValue = String(row.original[searchKey] ?? "").toLowerCase();
					return cellValue.includes(String(filterValue).toLowerCase());
				}
			: "includesString",
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
		autoResetPageIndex: false,
	});

	const handlePageSizeChange = React.useCallback((value: string) => {
		const size = Number(value);
		setPagination({ pageIndex: 0, pageSize: size });
	}, []);

	const pageIndex = pagination.pageIndex;
	const currentPageSize = pagination.pageSize;
	const pageCount = table.getPageCount();
	const totalRows = table.getFilteredRowModel().rows.length;
	const firstRow = totalRows === 0 ? 0 : pageIndex * currentPageSize + 1;
	const lastRow = Math.min((pageIndex + 1) * currentPageSize, totalRows);

	return (
		<div className="space-y-4">
			{enableSearch && (
				<div className="flex items-center gap-2">
					<Input
						placeholder={resolvedSearchPlaceholder}
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="max-w-sm"
					/>
					{globalFilter && (
						<Button variant="ghost" size="sm" onClick={() => setGlobalFilter("")}>
							{t("common.clear", { defaultValue: "Clear" })}
						</Button>
					)}
				</div>
			)}

			<div className="rounded-md border overflow-x-auto">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={header.column.getCanSort() ? "cursor-pointer select-none hover:bg-muted/50" : ""}
										onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
									>
										{header.isPlaceholder ? null : (
											<div className="flex items-center gap-1">
												{flexRender(header.column.columnDef.header, header.getContext())}
												{header.column.getIsSorted() === "asc" && <span className="text-xs">{"\u2191"}</span>}
												{header.column.getIsSorted() === "desc" && <span className="text-xs">{"\u2193"}</span>}
											</div>
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={`loading-${i}`}>
									{columns.map((_col, j) => (
										<TableCell key={`loading-${i}-${j}`}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
									{resolvedEmptyMessage}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{enablePagination && totalRows > 0 && (
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div className="text-sm text-muted-foreground">
						{t("common.showingRange", {
							from: firstRow,
							to: lastRow,
							total: totalRows,
							defaultValue: "Showing {{from}}-{{to}} of {{total}}",
						})}
					</div>
					<div className="flex items-center gap-4 flex-wrap">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">
								{t("common.rowsPerPage", { defaultValue: "Rows per page" })}
							</span>
							<Select value={String(currentPageSize)} onValueChange={handlePageSizeChange}>
								<SelectTrigger className="w-20 h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAGE_SIZE_OPTIONS.map((n) => (
										<SelectItem key={n} value={String(n)}>
											{n}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}
								title={t("common.firstPage", { defaultValue: "First page" })}
							>
								{"<<"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
								title={t("common.previousPage", { defaultValue: "Previous page" })}
							>
								{"<"}
							</Button>
							<span className="text-sm mx-2 whitespace-nowrap">
								{t("common.pageOfN", {
									current: pageIndex + 1,
									total: Math.max(1, pageCount),
									defaultValue: "Page {{current}} of {{total}}",
								})}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
								title={t("common.nextPage", { defaultValue: "Next page" })}
							>
								{">"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.setPageIndex(pageCount - 1)}
								disabled={!table.getCanNextPage()}
								title={t("common.lastPage", { defaultValue: "Last page" })}
							>
								{">>"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
