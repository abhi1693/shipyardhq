"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import type { OrganizationMembership, User } from "@prisma/client"
import { linkify, formatDate } from "@/lib/ui/formatters"

type MembershipWithUser = OrganizationMembership & {
  user: User
}

export function OrganizationMembersRelationship({
  rows,
}: {
  rows: MembershipWithUser[]
}) {
  const columns: ColumnDef<MembershipWithUser>[] = [
    {
      accessorKey: "user",
      header: "Member",
      cell: ({ row }) =>
        linkify({
          label: `${row.original.user.firstName} ${row.original.user.lastName}`.trim(),
          href: `/admin/users/${row.original.user.id}`,
          subtext: row.original.user.email,
        }),
    },
    {
      accessorKey: "jobTitle",
      header: "Job Title",
      cell: ({ row }) => row.original.jobTitle || "—",
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return (
    <Relationship title="Members" rows={rows} columns={columns} />
  )
}

