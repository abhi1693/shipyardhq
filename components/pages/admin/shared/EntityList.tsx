"use client"

import { ColumnDef } from "@tanstack/react-table"
import DataTable from "@/components/molecules/DataTable"

interface EntityListProps<T> {
  data: Partial<T>[]
  columns: ColumnDef<Partial<T>>[]
  pageCount?: number
}

export function EntityList<T>({
  data,
  columns,
  pageCount = 10,
}: EntityListProps<T>) {
  return <DataTable columns={columns} data={data} pageCount={pageCount} />
}
