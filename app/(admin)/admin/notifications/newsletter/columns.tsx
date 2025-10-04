"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import DeleteButton from "@/components/molecules/DeleteButton"
import { formatDate, linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"
import { NewsletterSubscription } from "@/lib/vendor/prisma/client"

export const columns: ColumnDef<NewsletterSubscription>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) =>
      linkify({
        label: row.original.email,
        href: `mailto:${row.original.email}`,
      }),
  },
  {
    accessorKey: "createdAt",
    header: "Subscribed",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: "actions",
    header: () => null,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Link
          href={adminPath("notifications", "newsletter", row.original.id, "delete")}
        >
          <DeleteButton size="sm" />
        </Link>
      </div>
    ),
  },
]
