"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import Link from "next/link"
import { MousePointerClick, ThumbsUp, Sparkles } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { BADGE_OPTIONS } from "@/lib/constants"
import { badgeColorMap, TailwindColor } from "@/lib/utils"

type Upvoter = {
  id: string
  user: { firstName: string; lastName?: string | null }
}

type BadgeItem = { id: string; badge: string; expiresAt: string | Date | null }

export default function PerformanceCard({
  upvotes = 0,
  clicks = 0,
  upvoters = [],
  badges = [],
  productName,
  tagline,
  hasBanner,
  ogImageUrl,
  editHref,
}: {
  upvotes?: number
  clicks?: number
  upvoters?: Upvoter[]
  badges?: BadgeItem[]
  productName: string
  tagline?: string | null
  hasBanner?: boolean
  ogImageUrl?: string | null
  editHref: string
}) {
  const daysLeft = (d: Date | string | null | undefined) => {
    if (!d) return null
    const left = Math.ceil(
      (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return left
  }

  return (
    <Card className="col-span-12 md:col-span-4">
      <CardHeader>
        <CardTitle className="text-base">Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
              <ThumbsUp className="h-3.5 w-3.5" /> Upvotes
            </div>
            <div className="text-2xl font-bold leading-tight">{upvotes}</div>
          </div>
          <div className="rounded-md border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
              <MousePointerClick className="h-3.5 w-3.5" /> Clicks
            </div>
            <div className="text-2xl font-bold leading-tight">{clicks}</div>
          </div>
        </div>

        {/* Upvoters */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Recent upvoters
          </div>
          {upvoters.length ? (
            <div className="flex -space-x-2">
              {upvoters.slice(0, 8).map((u) => (
                <Avatar
                  key={u.id}
                  className="ring-2 ring-background"
                  title={`${u.user.firstName} ${u.user.lastName || ""}`}
                >
                  <AvatarFallback>
                    {u.user.firstName?.[0] || "?"}
                    {u.user.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No recent upvotes
            </div>
          )}
        </div>

        {/* Badges */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Badges</div>
          {badges.length ? (
            <div className="flex flex-wrap gap-2">
              {badges.slice(0, 6).map((b) => {
                const left = daysLeft(b.expiresAt)
                const expiryText = b.expiresAt
                  ? `Expires ${new Date(b.expiresAt).toLocaleDateString()}${left != null ? ` (${left}d left)` : ""}`
                  : "No expiry"
                const def = BADGE_OPTIONS.find((o) => o.value === b.badge)
                const colorCls = def?.color
                  ? badgeColorMap[def.color as TailwindColor]
                  : "bg-muted text-muted-foreground border"
                return (
                  <Tooltip key={b.id}>
                    <TooltipTrigger asChild>
                      <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${colorCls}`}>
                        <span aria-hidden>{def?.icon ?? "🏷️"}</span>
                        <span className="truncate max-w-[8rem]">
                          {def?.label ?? b.badge}
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>{expiryText}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No badges</div>
          )}
        </div>

        {/* SEO snippet */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">SEO preview</div>
          <div className="rounded border p-3 bg-muted/30">
            <div className="text-sm font-medium truncate">{productName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {tagline}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              OG image:{" "}
              {ogImageUrl ? (
                <Link
                  href={ogImageUrl}
                  target="_blank"
                  className="underline break-all"
                >
                  {hasBanner ? "Banner" : "Logo"}
                </Link>
              ) : (
                <>—</>
              )}
            </div>
            <div className="mt-2">
              <Link
                href={editHref}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Sparkles className="h-3 w-3" /> Improve SEO
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
