"use client"

import { useTransition, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { createBillingPortalAction } from "@/actions/member/billing/portal"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { BADGE_CELEBRATION_EVENT } from "@/components/molecules/ProductBadgeCelebrationGate"
import { cn } from "@/lib/utils"
import {
  Award,
  BarChart3,
  CreditCard,
  ExternalLink,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react"

type ProductStatus = "draft" | "published" | "archived"

function getStatusBadgeVariant(status: ProductStatus) {
  if (status === "published") return "success"
  if (status === "draft") return "secondary"
  return "outline"
}

function IconAction({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6} className={className}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export default function MemberProductHeaderActions({
  status,
  publicPath,
  editPath,
  analyticsPath,
  canViewAnalytics,
  upgradePath,
  deletePath,
  canDelete = false,
  showStatus = true,
  className,
  planAction = "promote",
}: {
  status: ProductStatus
  publicPath: string
  editPath: string
  analyticsPath: string
  canViewAnalytics: boolean
  upgradePath: string
  deletePath: string
  canDelete?: boolean
  showStatus?: boolean
  className?: string
  planAction?: "promote" | "manage_subscription" | "none"
}) {
  const [isBillingPortalPending, startBillingPortal] = useTransition()

  const statusBadgeVariant = getStatusBadgeVariant(status)
  const iconActionClass =
    "size-9 rounded-lg border-0 bg-transparent p-0 text-[#43474c] shadow-none hover:bg-[#F8FAFC] hover:text-[#0051d5]"
  const destructiveIconActionClass =
    "size-9 rounded-lg border-0 bg-transparent p-0 text-[#ba1a1a] shadow-none hover:bg-[#ffdad6] hover:text-[#93000a]"
  const promoteActionClass =
    "h-9 rounded-lg border border-[#F97316] bg-[#F97316] px-4 text-xs font-semibold uppercase tracking-[0.05em] text-white shadow-sm hover:bg-orange-600 hover:brightness-100"

  function openBillingPortal() {
    startBillingPortal(async () => {
      const res = (await createBillingPortalAction()) as {
        link?: string
        error?: string
      }

      if (res.link) {
        window.location.href = res.link
        return
      }

      toast.error(res.error || "Unable to open billing portal")
    })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {showStatus ? (
        <Badge variant={statusBadgeVariant as any} className="capitalize">
          {status}
        </Badge>
      ) : null}

      <IconAction label="View public">
        <Button variant="ghost" size="icon" asChild className={iconActionClass}>
          <Link
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View public page"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </IconAction>

      <IconAction label="Edit listing">
        <Button variant="ghost" size="icon" asChild className={iconActionClass}>
          <Link href={editPath} aria-label="Edit listing">
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </IconAction>

      {planAction === "manage_subscription" ? (
        <IconAction
          label={
            isBillingPortalPending ? "Opening portal" : "Manage subscription"
          }
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={iconActionClass}
            disabled={isBillingPortalPending}
            onClick={openBillingPortal}
            aria-label={
              isBillingPortalPending
                ? "Opening billing portal"
                : "Manage subscription"
            }
          >
            <CreditCard className="h-4 w-4" />
          </Button>
        </IconAction>
      ) : null}

      {planAction === "promote" ? (
        <Button size="sm" asChild className={promoteActionClass}>
          <Link
            href={upgradePath}
            aria-label="Promote product"
            className="inline-flex items-center"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Promote Product
          </Link>
        </Button>
      ) : null}

      {canViewAnalytics || planAction === "promote" ? (
        <IconAction label={canViewAnalytics ? "Analytics" : "Unlock analytics"}>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={iconActionClass}
          >
            <Link
              href={canViewAnalytics ? analyticsPath : upgradePath}
              aria-label={canViewAnalytics ? "Analytics" : "Unlock analytics"}
            >
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>
        </IconAction>
      ) : null}

      <IconAction label="Get badge">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconActionClass}
          onClick={() => {
            if (typeof window === "undefined") return
            window.dispatchEvent(new CustomEvent(BADGE_CELEBRATION_EVENT))
          }}
        >
          <Award className="h-4 w-4" />
        </Button>
      </IconAction>

      {canDelete ? (
        <IconAction label="Delete">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={destructiveIconActionClass}
          >
            <Link href={deletePath} aria-label="Delete product">
              <Trash2 className="h-4 w-4" />
            </Link>
          </Button>
        </IconAction>
      ) : null}
    </div>
  )
}
