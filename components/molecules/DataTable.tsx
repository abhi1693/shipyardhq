"use client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import React, { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ScrollArea, ScrollBar } from "@/components/atoms/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Button } from "@/components/atoms/button"
import { buildQuery } from "@/lib/urlParams"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSizeOptions?: number[]
  pageCount: number
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Search params
  const page = searchParams?.get("page") ?? "1"
  const pageAsNumber = Number(page)
  const fallbackPage =
    isNaN(pageAsNumber) || pageAsNumber < 1 ? 1 : pageAsNumber
  const per_page = searchParams?.get("limit") ?? "10"
  const perPageAsNumber = Number(per_page)
  const fallbackPerPage = isNaN(perPageAsNumber) ? 10 : perPageAsNumber

  // Handle server-side pagination
  const [{ pageIndex, pageSize }, setPagination] = React.useState({
    pageIndex: fallbackPage - 1,
    pageSize: fallbackPerPage,
  })

  useEffect(() => {
    const url = buildQuery(pathname ?? "", searchParams?.toString() ?? "", {
      page: String(pageIndex + 1),
      limit: String(pageSize),
    })
    router.push(url, {
      scroll: false,
    })
  }, [pageIndex, pageSize, pathname, router, searchParams])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack's hook provides imperative APIs that currently require skipping React compiler memoization.
  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      pagination: { pageIndex, pageSize },
    },
    onPaginationChange: setPagination,
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualFiltering: true,
  })

  const totalPages = table.getPageCount()
  const hasPagination = totalPages > 1

  return (
    <div className="space-y-4">
      <ScrollArea>
        <Table className="relative text-sm [&>tbody>tr:not(:last-child)]:border-b [&>tbody>tr]:border-slate-200/35">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-background/95 text-muted-foreground border-b border-slate-200/50"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="transition-colors hover:bg-slate-50 data-[state=selected]:bg-slate-100"
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-3 text-sm text-slate-700"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center justify-start text-xs text-muted-foreground sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-slate-600">Rows</span>
            <Select
              value={`${pageSize}`}
              onValueChange={(value: string) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 min-w-[5rem] rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasPagination ? (
          <div className="flex items-center justify-end gap-2 text-xs text-slate-600 sm:text-sm">
            <span className="px-3 py-1.5 text-sm font-medium text-foreground/75">
              Page {pageIndex + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                aria-label="Previous page"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Next page"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
