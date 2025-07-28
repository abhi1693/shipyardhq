"use client"

import { ColumnDef } from "@tanstack/react-table"
import { UseCaseCategory, Category, UseCase } from "@prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"

type AssignmentRow = UseCaseCategory & {
  category: Category
  useCase: UseCase
}

export const columns: ColumnDef<AssignmentRow>[] = [
  {
    accessorKey: "useCase.label",
    header: "Use Case",
    cell: ({ row }) =>
      linkify({
        label: row.original.useCase.label,
        href: `/admin/categories/use-cases/${row.original.useCase.id}`,
      }),
  },
  {
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) =>
      linkify({
        label: row.original.category.name,
        href: `/admin/categories/${row.original.category.id}`,
      }),
  },
  {
    accessorKey: "useCase.updatedAt",
    header: "Updated At",
    cell: ({ row }) => formatDate(row.original.useCase.updatedAt),
  },
]
