"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import type { OrganizationMembership, User } from "@prisma/client"
import { linkify, formatDate } from "@/lib/ui/formatters"
import Link from "next/link"

type MembershipWithUser = OrganizationMembership & {
  user: User
}

export function OrganizationMembersRelationship({
  rows,
  organizationId,
}: {
  rows: MembershipWithUser[]
  organizationId: string
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Link
          href={`/admin/organizations/${organizationId}/members/${row.original.id}/delete`}
          className="text-red-600 hover:underline text-xs"
        >
          Remove
        </Link>
      ),
    },
  ]

  return (
    <Relationship
      title="Members"
      rows={rows}
      columns={columns}
      action={
        <Link
          href={`/admin/organizations/${organizationId}/members/add`}
          className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
        >
          Add Member
        </Link>
      }
    />
  )
}
