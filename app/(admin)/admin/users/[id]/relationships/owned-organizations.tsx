"use client"

import { Relationship } from "@/components/molecules/Relationship"
import type { Organization } from "@/lib/vendor/prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { adminPath } from "@/lib/routes"
import { formatDate, linkify, placeholder } from "@/lib/ui/formatters"

export function UserOwnedOrganizationsRelationship({
  rows,
}: {
  rows: Organization[]
}) {
  const columns: ColumnDef<Organization>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) =>
        linkify({
          label: row.original.name,
          href: adminPath("organizations", row.original.id),
        }),
    },
    {
      accessorKey: "url",
      header: "Website",
      cell: ({ row }) =>
        row.original.url
          ? linkify({
              href: row.original.url,
              isExternal: true,
            })
          : placeholder(),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return (
    <Relationship
      title="Owned Organizations"
      rows={rows}
      columns={columns}
      emptyMessage="No owned organizations found."
    />
  )
}
