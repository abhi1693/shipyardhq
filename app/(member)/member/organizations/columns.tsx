"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Eye, Pencil, Trash2 } from "lucide-react"

import { linkify, formatDistanceToNow } from "@/lib/ui/formatters"
import { Button } from "@/components/atoms/button"

const minimalActionButton =
  "rounded-full border border-slate-200/70 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
const minimalActionLink = "inline-flex items-center gap-1.5 text-inherit"
const minimalActionIcon = "h-3.5 w-3.5"
const destructiveActionButton =
  "rounded-full border border-red-400/70 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"

export type MemberOrgRow = {
  id: string
  name: string
  url: string
  createdAt: string | Date
}

function getDisplayUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
  }
}

export const columns: ColumnDef<MemberOrgRow>[] = [
  {
    accessorKey: "name",
    header: () => (
      <span className="text-xs font-medium text-muted-foreground">Organization</span>
    ),
    cell: ({ row }) => (
      <div className="space-y-0.5">
        {linkify({
          label: row.original.name,
          href: `/member/organizations/${row.original.id}`,
        })}
        <p className="text-xs text-muted-foreground">
          {getDisplayUrl(String(row.original.url))}
        </p>
      </div>
    ),
    size: 240,
  },
  {
    accessorKey: "url",
    header: () => <span className="text-xs font-medium text-muted-foreground">Domain</span>,
    cell: ({ row }) =>
      linkify({
        label: getDisplayUrl(String(row.original.url)),
        href: String(row.original.url),
        isExternal: true,
      }),
  },
  {
    accessorKey: "createdAt",
    header: () => <span className="text-xs font-medium text-muted-foreground">Created</span>,
    cell: ({ row }) => formatDistanceToNow(row.original.createdAt),
  },
  {
    id: "actions",
    header: () => null,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button asChild size="sm" variant="ghost" className={minimalActionButton}>
          <Link
            href={`/member/organizations/${row.original.id}`}
            className={minimalActionLink}
          >
            <Eye className={minimalActionIcon} /> View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className={minimalActionButton}>
          <Link
            href={`/member/organizations/${row.original.id}/edit`}
            className={minimalActionLink}
          >
            <Pencil className={minimalActionIcon} /> Edit
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className={destructiveActionButton}>
          <Link
            href={`/member/organizations/${row.original.id}/delete`}
            className={minimalActionLink}
          >
            <Trash2 className={minimalActionIcon} /> Delete
          </Link>
        </Button>
      </div>
    ),
  },
]
