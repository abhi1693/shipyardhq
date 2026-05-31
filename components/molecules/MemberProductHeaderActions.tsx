"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu"
import { BADGE_CELEBRATION_EVENT } from "@/components/molecules/ProductBadgeCelebrationGate"
import { setProductStatusAction } from "@/actions/admin/products/actions"
import { cn } from "@/lib/utils"
import {
  Archive,
  BarChart3,
  ExternalLink,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Rocket,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react"

type ProductStatus = "draft" | "published" | "archived"

function getStatusBadgeVariant(status: ProductStatus) {
  if (status === "published") return "success"
  if (status === "draft") return "secondary"
  return "outline"
}

export default function MemberProductHeaderActions({
  productId,
  status,
  canChangeStatus,
  statusChangeUnlockAt,
  publicPath,
  editPath,
  analyticsPath,
  canViewAnalytics,
  upgradePath,
  deletePath,
  canDelete = false,
  className,
}: {
  productId: string
  status: ProductStatus
  canChangeStatus: boolean
  statusChangeUnlockAt?: number | null
  publicPath: string
  editPath: string
  analyticsPath: string
  canViewAnalytics: boolean
  upgradePath: string
  deletePath: string
  canDelete?: boolean
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusChangeAllowed, setStatusChangeAllowed] =
    useState(canChangeStatus)

  useEffect(() => {
    setStatusChangeAllowed(canChangeStatus)
  }, [canChangeStatus])

  useEffect(() => {
    if (statusChangeAllowed) return
    if (!statusChangeUnlockAt) return
    if (Date.now() >= statusChangeUnlockAt) {
      setStatusChangeAllowed(true)
    }
  }, [statusChangeAllowed, statusChangeUnlockAt])

  const statusBadgeVariant = getStatusBadgeVariant(status)
  const isDraft = status === "draft"
  const editVariant: React.ComponentProps<typeof Button>["variant"] = isDraft
    ? "outline"
    : "default"

  function updateStatus(next: ProductStatus) {
    startTransition(async () => {
      const res = (await setProductStatusAction(productId, next)) as any
      if (res?.error) toast.error(res.error)
      else toast.success(`Status set to ${next}`)
      router.refresh()
    })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant={statusBadgeVariant as any} className="capitalize">
        {status}
      </Badge>

      <Button variant={editVariant} size="sm" asChild className="h-9 px-4">
        <Link
          href={editPath}
          aria-label="Edit listing"
          className="inline-flex items-center"
        >
          <Pencil className="h-4 w-4 mr-2" /> Edit listing
        </Link>
      </Button>

      <Button variant="outline" size="sm" asChild className="h-9 px-4">
        <Link
          href={publicPath}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View public page"
          className="inline-flex items-center"
        >
          <ExternalLink className="h-4 w-4 mr-2" /> View public
        </Link>
      </Button>

      <Button variant="secondary" size="sm" asChild className="h-9 px-4">
        <Link
          href={canViewAnalytics ? analyticsPath : upgradePath}
          aria-label={canViewAnalytics ? "Open analytics" : "Unlock analytics"}
          className="inline-flex items-center"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          {canViewAnalytics ? "Analytics" : "Unlock analytics"}
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-3"
            disabled={isPending}
          >
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Growth</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => router.push(upgradePath)}>
            <Sparkles className="h-4 w-4" />
            Boost & upgrades
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              if (typeof window === "undefined") return
              window.dispatchEvent(new CustomEvent(BADGE_CELEBRATION_EVENT))
            }}
          >
            <Sparkles className="h-4 w-4" />
            Get badge
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {statusChangeAllowed ? (
            <>
              {status !== "published" ? (
                <DropdownMenuItem onSelect={() => updateStatus("published")}>
                  <Rocket className="h-4 w-4" /> Publish
                </DropdownMenuItem>
              ) : null}
              {status === "published" ? (
                <DropdownMenuItem onSelect={() => updateStatus("draft")}>
                  <EyeOff className="h-4 w-4" /> Unpublish
                </DropdownMenuItem>
              ) : null}
              {status === "archived" ? (
                <DropdownMenuItem onSelect={() => updateStatus("draft")}>
                  <Undo2 className="h-4 w-4" /> Restore
                </DropdownMenuItem>
              ) : null}
              {status !== "archived" ? (
                <DropdownMenuItem onSelect={() => updateStatus("archived")}>
                  <Archive className="h-4 w-4" /> Archive
                </DropdownMenuItem>
              ) : null}
            </>
          ) : (
            <DropdownMenuItem disabled>
              Status locked while boosted
            </DropdownMenuItem>
          )}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => router.push(deletePath)}
              >
                <Trash2 className="h-4 w-4" />
                Delete…
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
