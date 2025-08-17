"use client"

import { ColumnDef } from "@tanstack/react-table"
import { UseCaseCategory } from "@/lib/vendor/prisma/client"
import { linkify } from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"

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
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/categories/use-cases/assignments/${row.original.useCaseId}/${row.original.categoryId}`}
        >
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link
          href={`/admin/categories/use-cases/assignments/${row.original.useCaseId}/${row.original.categoryId}/edit`}
        >
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]
