"use client"

import { ColumnDef } from "@tanstack/react-table"
import { UseCaseCategory } from "@prisma/client"
import { linkify } from "@/lib/ui/formatters"

type AssignmentWithRelations = UseCaseCategory & {
  useCase: { id: string; label: string; slug: string }
  category: { id: string; name: string; slug: string }
}

export const columns: ColumnDef<AssignmentWithRelations>[] = [
  {
    accessorKey: "useCaseId",
    header: "Assignment",
    cell: ({ row }) =>
      linkify({
        label: `${row.original.useCase.label} → ${row.original.category.name}`,
        href: `/admin/categories/use-cases/assignments/${row.original.useCaseId}/${row.original.categoryId}`,
        subtext: `${row.original.useCase.slug} • ${row.original.category.slug}`,
      }),
  },
  {
    accessorKey: "useCase.label",
    header: "Use Case",
    cell: ({ row }) =>
      linkify({
        label: row.original.useCase.label,
        href: `/admin/categories/use-cases/${row.original.useCase.id}`,
        subtext: row.original.useCase.slug,
      }),
  },
  {
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) =>
      linkify({
        label: row.original.category.name,
        href: `/admin/categories/${row.original.category.id}`,
        subtext: row.original.category.slug,
      }),
  },
]
