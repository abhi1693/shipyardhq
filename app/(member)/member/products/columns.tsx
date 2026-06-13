"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { BarChart3, Megaphone, Pencil, Trash2 } from "lucide-react"

import type {
  Product,
  ProductAnalytics,
  ProductVerification,
} from "@/lib/vendor/prisma/client"
import { formatDistanceToNow, linkify, image } from "@/lib/ui/formatters"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  memberProductAnalyticsPath,
  memberProductDeletePath,
  memberProductEditPath,
  memberProductPath,
  memberProductUpgradePath,
  categoryPath,
} from "@/lib/routes"

const minimalActionButton =
  "rounded-full border border-slate-200/70 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
const minimalActionLink = "inline-flex items-center gap-1.5 text-inherit"
const minimalActionIcon = "h-3.5 w-3.5"
const destructiveActionButton =
  "rounded-full border border-red-400/70 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"

export type MemberProductRow = Product & {
  verification: ProductVerification | null
  analytics: ProductAnalytics | null
  category?: { id: string; name: string; slug: string }
  plan?: { id: string; name: string }
  hasValidatedPlan?: boolean
  canDelete?: boolean
  canViewAnalytics?: boolean
}

export const columns: ColumnDef<MemberProductRow>[] = [
  {
    id: "logo",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Logo</span>
    ),
    cell: ({ row }) => image(row.original.logo, row.original.name),
    size: 60,
  },
  {
    accessorKey: "name",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Product</span>
    ),
    cell: ({ row }) => (
      <div className="space-y-0.5">
        {linkify({
          label: row.original.name,
          href: row.original.hasValidatedPlan
            ? memberProductPath(row.original.slug)
            : memberProductUpgradePath(row.original.slug),
        })}
        <p className="text-xs text-muted-foreground">{row.original.slug}</p>
      </div>
    ),
    size: 200,
  },
  {
    id: "category",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">
        Category
      </span>
    ),
    cell: ({ row }) =>
      row.original.category ? (
        linkify({
          label: row.original.category.name,
          href: categoryPath(row.original.category.slug),
        })
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "plan",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Plan</span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-slate-700">
        {row.original.plan?.name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "verification",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Domain</span>
    ),
    cell: ({ row }) => (
      <Badge
        variant={row.original.verification?.isVerified ? "success" : "outline"}
        className="rounded-full border-[1px] px-2 py-0.5 text-[11px]"
      >
        {row.original.verification?.isVerified ? "Verified" : "Unverified"}
      </Badge>
    ),
  },
  {
    accessorKey: "analytics.upvotes",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Upvotes</span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-slate-700">
        {row.original.analytics?.upvotes ?? 0}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Status</span>
    ),
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.status === "draft"
            ? "secondary"
            : row.original.status === "archived"
              ? "outline"
              : "success"
        }
        className="rounded-full border-[1px] px-2 py-0.5 text-[11px]"
      >
        {String(row.original.status || "").replace("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Created</span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-slate-600">
        {formatDistanceToNow(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => null,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        {row.original.canViewAnalytics ? (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className={minimalActionButton}
          >
            <Link
              href={memberProductAnalyticsPath(row.original.slug)}
              className={minimalActionLink}
            >
              <BarChart3 className={minimalActionIcon} /> Analytics
            </Link>
          </Button>
        ) : null}
        <Button
          asChild
          size="sm"
          variant="ghost"
          className={minimalActionButton}
        >
          <Link
            href={memberProductUpgradePath(row.original.slug)}
            className={minimalActionLink}
          >
            <Megaphone className={minimalActionIcon} /> Promote
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className={minimalActionButton}
        >
          <Link
            href={memberProductEditPath(row.original.slug)}
            className={minimalActionLink}
          >
            <Pencil className={minimalActionIcon} /> Edit
          </Link>
        </Button>
        {row.original.canDelete ? (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className={destructiveActionButton}
          >
            <Link
              href={memberProductDeletePath(row.original.slug)}
              className={minimalActionLink}
            >
              <Trash2 className={minimalActionIcon} /> Delete
            </Link>
          </Button>
        ) : null}
      </div>
    ),
  },
]
