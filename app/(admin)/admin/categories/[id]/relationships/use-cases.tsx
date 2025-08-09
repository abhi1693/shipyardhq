"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import { UseCaseCategory } from "@prisma/client"
import { linkify } from "@/lib/ui/formatters"

type UseCaseWithJoin = UseCaseCategory & {
  useCase: { id: string; label: string; slug: string }
}

export function CategoryUseCaseRelationship({
  rows,
}: {
  rows: UseCaseWithJoin[]
}) {
  const columns: ColumnDef<UseCaseWithJoin>[] = [
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
  ]

  return (
    <Relationship title="Related Use Cases" rows={rows} columns={columns} />
  )
}
