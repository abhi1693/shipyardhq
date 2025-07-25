"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User } from "@prisma/client"
import { format } from "date-fns"
import Link from "next/link"

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const user = row.original
      return (
        <Link
          href={`/admin/users/${user.id}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {user.email}
        </Link>
      )
    },
  },
  {
    accessorKey: "firstName",
    header: "First Name",
    cell: ({ row }) => row.original.firstName,
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
    cell: ({ row }) => row.original.lastName,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => row.original.role,
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "yyyy-MM-dd HH:mm"),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) =>
      format(new Date(row.original.updatedAt), "yyyy-MM-dd HH:mm"),
  },
]
