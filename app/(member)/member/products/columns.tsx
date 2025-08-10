"use client"
import { Product, ProductVerification, ProductAnalytics } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import {
  formatBoolean,
  linkify,
  formatDistanceToNow,
} from "@/lib/ui/formatters"
import { Badge } from "@/components/atoms/badge"

export const columns: ColumnDef<
  Partial<
    Product & {
      verification?: Partial<ProductVerification> | null
      analytics?: Partial<ProductAnalytics> | null
    }
  >
>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: `/member/products/${row.original.slug}`,
      }),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDistanceToNow(row.original.createdAt),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "draft" ? "secondary" : row.original.status === "archived" ? "outline" : "success"}>
        {String(row.original.status || "").replace("_", " ")}
      </Badge>
    ),
  },
  {
    id: "verified",
    header: "Verified",
    cell: ({ row }) =>
      formatBoolean(
        row.original.verification?.isVerified ?? false,
        "Verified",
        "Not Verified",
      ),
  },
  {
    id: "upvotes",
    header: "Upvotes",
    cell: ({ row }) => row.original.analytics?.upvotes ?? 0,
  },
  {
    id: "clicks",
    header: "Clicks",
    cell: ({ row }) => row.original.analytics?.clicks ?? 0,
  },
]
