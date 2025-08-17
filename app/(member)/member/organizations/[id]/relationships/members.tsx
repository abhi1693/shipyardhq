"use client"

import { Relationship } from "@/components/molecules/Relationship"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import AddButton from "@/components/molecules/AddButton"
import { formatDistanceToNow, linkify } from "@/lib/ui/formatters"

type MemberRow = {
  id: string
  user: { id: string; email: string; firstName: string; lastName: string }
  createdAt: string | Date
  isOwner?: boolean
}

export function MemberOrganizationMembersRelationship({
  rows,
  organizationId,
  canManage,
}: {
  rows: MemberRow[]
  organizationId: string
  canManage: boolean
}) {
  const columns: ColumnDef<MemberRow>[] = [
    {
      accessorKey: "user",
      header: "Member",
      cell: ({ row }) =>
        linkify({
          label:
            `${row.original.user.firstName ?? ""} ${row.original.user.lastName ?? ""}`.trim() ||
            row.original.user.email,
          href: `/admin/users/${row.original.user.id}`,
          subtext: row.original.user.email,
        }),
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => (row.original.isOwner ? "Owner" : "Member"),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) =>
        formatDistanceToNow(new Date(row.original.createdAt as any)),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        if (!canManage || row.original.isOwner)
          return <span className="text-muted-foreground">—</span>
        return (
          <Link
            href={`/member/organizations/${organizationId}/members/${row.original.id}/delete`}
            className="text-red-600 hover:underline text-xs"
          >
            Remove
          </Link>
        )
      },
    },
  ]

  return (
    <Relationship
      title="Members"
      rows={rows}
      columns={columns}
      action={
        canManage ? (
          <Link href={`/member/organizations/${organizationId}/members/add`}>
            <AddButton size="sm" label="Add Member" />
          </Link>
        ) : undefined
      }
    />
  )
}
