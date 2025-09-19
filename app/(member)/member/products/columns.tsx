"use client"
import {
  Product,
  ProductVerification,
  ProductAnalytics,
} from "@/lib/vendor/prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import {
  formatBoolean,
  linkify,
  formatDistanceToNow,
  image,
} from "@/lib/ui/formatters"
import { Badge } from "@/components/atoms/badge"
import Link from "next/link"
import { Button } from "@/components/atoms/button"
import { Eye, Pencil, Trash2 } from "lucide-react"

const actionButtonClass =
  "rounded-full border border-[color:var(--brand-1)/0.25] bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-[color:var(--brand-1)/0.35] hover:bg-[color:var(--brand-1)/0.08]"
const actionLinkClass = "inline-flex items-center gap-2 text-inherit"
const actionIconClass = "h-4 w-4"
const destructiveButtonClass =
  "rounded-full border border-red-500/40 bg-background px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:border-red-500/50 hover:bg-red-500/10"

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
        <Button
          asChild
          size="sm"
          variant="ghost"
          className={actionButtonClass}
        >
          <Link
            href={`/member/products/${row.original.slug}`}
            className={actionLinkClass}
          >
            <Eye className={actionIconClass} /> View
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className={actionButtonClass}
        >
          <Link
            href={`/member/products/${row.original.slug}/edit`}
            className={actionLinkClass}
          >
            <Pencil className={actionIconClass} /> Edit
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className={destructiveButtonClass}
        >
          <Link
            href={`/member/products/${row.original.slug}/delete`}
            className={actionLinkClass}
          >
            <Trash2 className={actionIconClass} /> Delete
          </Link>
        </Button>
      </div>
    ),
  },
]
