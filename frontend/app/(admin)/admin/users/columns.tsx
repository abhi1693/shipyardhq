"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { User } from "@/lib/vendor/prisma/client"
import { formatDate, linkify } from "@/lib/ui/formatters"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"
import { Badge } from "@/components/atoms/badge"
import UserStatusMenu from "@/components/molecules/UserStatusMenu"
import { adminPath } from "@/lib/routes"

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) =>
      linkify({
        label: row.original.email,
        href: adminPath("users", row.original.id),
      }),
  },
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => row.original.role,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === "active"
            ? "success"
            : row.original.status === "terminated"
              ? "destructive"
              : "secondary"
        }
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <UserStatusMenu
          userId={row.original.id}
          clerkId={row.original.clerkId}
          status={row.original.status}
        />
        <Link href={adminPath("users", row.original.id)}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={adminPath("users", row.original.id, "edit")}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>
    ),
  },
]
