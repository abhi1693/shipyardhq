"use client"
import {
  Product,
  ProductVerification,
  ProductAnalytics,
} from "@/lib/vendor/prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { formatBoolean, linkify, formatDistanceToNow, image } from "@/lib/ui/formatters"
import { Badge } from "@/components/atoms/badge"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil } from "lucide-react"
import DeleteButton from "@/components/molecules/DeleteButton"

export type MemberProductRow = Product & {
  verification: ProductVerification | null
  analytics: ProductAnalytics | null
  category?: { id: string; name: string; slug: string }
  plan?: { id: string; name: string }
}

export const columns: ColumnDef<MemberProductRow>[] = [
  // Visual identity first
  {
    id: "logo",
    header: "Logo",
    cell: ({ row }) => image(row.original.logo, row.original.name),
  },
  // Primary identifier
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) =>
      linkify({
        label: row.original.name,
        href: `/member/products/${row.original.slug}`,
      }),
  },
  // Classification and links
  {
    id: "category",
    header: "Category",
    cell: ({ row }) =>
      row.original.category
        ? linkify({
            label: row.original.category.name,
            href: `/categories/${row.original.category.slug}`,
          })
        : "—",
  },
  {
    accessorKey: "websiteUrl",
    header: "Website",
    cell: ({ row }) =>
      linkify({
        label: row.original.websiteUrl,
        href: row.original.websiteUrl,
        isExternal: true,
      }),
  },
  // Commercial context
  {
    id: "plan",
    header: "Plan",
    cell: ({ row }) => row.original.plan?.name ?? "—",
  },
  // State and verification
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === "draft"
            ? "secondary"
            : row.original.status === "archived"
              ? "outline"
              : "success"
        }
      >
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
  // Performance
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
  // Temporal info near the end
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDistanceToNow(row.original.createdAt),
  },
  // Row actions last
  {
    id: "actions",
    header: () => null,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Link href={`/member/products/${row.original.slug}`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" /> View
          </Button>
        </Link>
        <Link href={`/member/products/${row.original.slug}/edit`}>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
        <Link href={`/member/products/${row.original.slug}/delete`}>
          <DeleteButton size="sm" />
        </Link>
      </div>
    ),
  },
]
