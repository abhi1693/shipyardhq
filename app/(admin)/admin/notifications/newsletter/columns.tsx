"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import DeleteButton from "@/components/molecules/DeleteButton"
import { formatDate, linkify, placeholder } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"
import type { NewsletterSubscriberWithUser } from "@/types/admin/newsletter"

export const columns: ColumnDef<NewsletterSubscriberWithUser>[] = [
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
    id: "user",
    header: "User",
    cell: ({ row }) => {
      const account = row.original.user
      if (!account) {
        return placeholder()
      }

      const fullName = [account.firstName, account.lastName]
        .filter(Boolean)
        .join(" ")

      return linkify({
        label: fullName || account.email,
        href: adminPath("users", account.id),
      })
    },
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
          href={adminPath(
            "notifications",
            "newsletter",
            row.original.id,
            "delete",
          )}
        >
          <DeleteButton size="sm" />
        </Link>
      </div>
    ),
  },
]
