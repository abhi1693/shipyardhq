"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import type { OrganizationMembership, User } from "@/lib/vendor/prisma/client"
import { linkify, formatDate } from "@/lib/ui/formatters"
import Link from "next/link"
import AddButton from "@/components/molecules/AddButton"
import { adminPath } from "@/lib/routes"

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
          label:
            `${row.original.user.firstName} ${row.original.user.lastName}`.trim(),
          href: adminPath("users", row.original.user.id),
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
          href={adminPath(
            "organizations",
            organizationId,
            "members",
            row.original.id,
            "delete",
          )}
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
        <Link href={adminPath("organizations", organizationId, "members", "add")}>
          <AddButton size="sm" label="Add Member" />
        </Link>
      }
    />
  )
}
