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
      <ScrollArea className="rounded-2xl border border-[color:var(--brand-1)/0.15] bg-background/96">
        <Table className="relative text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-background/90 text-muted-foreground [&_th]:uppercase [&_th]:tracking-[0.08em]"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="px-5 py-3 text-[11px] font-semibold text-foreground/80"
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
                  className="border-border/40 transition-colors even:bg-background/80 hover:bg-[color:var(--brand-1)/0.08]"
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-5 py-3 text-sm text-foreground/80"
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

      <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--brand-1)/0.08] bg-background/96 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center justify-end text-xs text-muted-foreground sm:text-sm">
          <div className="flex items-center gap-3 rounded-full bg-background/90 px-4 py-1.5 text-xs text-foreground/75 sm:text-sm">
            <span className="whitespace-nowrap text-foreground/70">Rows</span>
            <Select
              value={`${pageSize}`}
              onValueChange={(value: string) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 min-w-[5.5rem] rounded-full border border-[color:var(--brand-1)/0.25] bg-background/95 px-3 text-sm font-medium">
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
          <div className="flex items-center justify-end gap-2 text-xs text-foreground/80 sm:text-sm">
            <span className="px-3 py-1.5 text-sm font-medium text-foreground/75">
              Page {pageIndex + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5">
              <Button
                aria-label="Previous page"
                variant="outline"
                size="icon"
                className="border-none bg-transparent text-foreground/70 hover:bg-[color:var(--brand-1)/0.12]"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Next page"
                variant="outline"
                size="icon"
                className="border-none bg-transparent text-foreground/70 hover:bg-[color:var(--brand-1)/0.12]"
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
