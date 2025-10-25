"use client"

import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Pencil } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { Button } from "@/components/atoms/button"
import DeleteButton from "@/components/molecules/DeleteButton"
import { formatDate, linkify } from "@/lib/ui/formatters"
import { adminPath } from "@/lib/routes"
import { Prisma } from "@/lib/vendor/prisma/client"

export type AlternativeProductRow =
  Prisma.AlternativeProductGetPayload<{
    include: {
      categories: true
      _count: { select: { products: true } }
    }
  }>

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("")
  return initials || "AP"
}

export const columns: ColumnDef<AlternativeProductRow>[] = [
  {
    id: "logo",
    header: "Logo",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border">
          <AvatarImage
            src={row.original.logoUrl}
            alt={`${row.original.name} logo`}
          />
          <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          {linkify({
            label: row.original.name,
            href: adminPath("products", "alternatives", row.original.id),
            subtext: row.original.slug,
          })}
          <Link
            href={row.original.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline"
          >
            {row.original.websiteUrl}
          </Link>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    meta: {
      cellClassName: "align-top whitespace-normal break-words",
    },
    cell: ({ row }) => (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {row.original.description}
      </p>
    ),
  },
  {
    id: "categories",
    header: "Categories",
    cell: ({ row }) => {
      const labels = row.original.categories.map((category) => category.name)
      return labels.length
        ? labels.join(", ")
        : "—"
    },
  },
  {
    id: "assignedProducts",
    header: "Assigned Products",
    cell: ({ row }) => row.original._count.products,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      headerClassName: "w-[200px]",
    },
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href={adminPath("products", "alternatives", row.original.id, "edit")}
        >
          <Button size="sm" variant="outline">
            <Pencil className="mr-1 h-4 w-4" />
            Edit
          </Button>
        </Link>
        <Link
          href={adminPath("products", "alternatives", row.original.id, "delete")}
        >
          <DeleteButton size="sm" />
        </Link>
      </div>
    ),
  },
]
