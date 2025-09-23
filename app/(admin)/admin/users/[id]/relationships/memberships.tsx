"use client"

import { Relationship } from "@/components/molecules/Relationship"
import type {
  Organization,
  OrganizationMembership,
} from "@/lib/vendor/prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { adminPath } from "@/lib/routes"
import { formatDate, linkify, placeholder } from "@/lib/ui/formatters"

type MembershipWithOrganization = OrganizationMembership & {
  organization: Organization
}

export function UserMembershipRelationship({
  rows,
}: {
  rows: MembershipWithOrganization[]
}) {
  const columns: ColumnDef<MembershipWithOrganization>[] = [
    {
      accessorKey: "organization.name",
      header: "Organization",
      cell: ({ row }) =>
        linkify({
          label: row.original.organization.name,
          href: adminPath("organizations", row.original.organization.id),
        }),
    },
    {
      accessorKey: "jobTitle",
      header: "Job Title",
      cell: ({ row }) => row.original.jobTitle || placeholder(),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]

  return (
    <Relationship
      title="Organization Memberships"
      rows={rows}
      columns={columns}
    />
  )
}
