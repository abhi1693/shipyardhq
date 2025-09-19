"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import Link from "next/link"
import { MousePointerClick, ThumbsUp, Sparkles } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { BADGE_OPTIONS } from "@/lib/constants"
import { TailwindColor, cn } from "@/lib/utils"

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
  className,
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
  className?: string
}) {
  const daysLeft = (d: Date | string | null | undefined) => {
    if (!d) return null
    const left = Math.ceil(
      (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return left
  }

  const statTileClass =
    "rounded-2xl border border-[color:var(--brand-1)/0.18] bg-background/95 px-4 py-4 text-center"
  const statLabelClass =
    "inline-flex items-center justify-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
  const statValueClass = "text-3xl font-bold tracking-tight text-foreground"
  const pillListClass =
    "rounded-2xl border border-[color:var(--brand-1)/0.16] bg-background/95 px-4 py-3"
  const badgeChipBaseClass =
    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm"
  const seoPanelClass =
    "rounded-2xl border border-[color:var(--brand-1)/0.18] bg-background/95 px-4 py-3"

  const themedBadgeColorMap: Record<TailwindColor, string> = {
    blue: "border-blue-400/45 bg-blue-500/12 text-blue-400",
    green: "border-emerald-400/45 bg-emerald-500/12 text-emerald-400",
    yellow: "border-amber-400/45 bg-amber-400/15 text-amber-500",
    red: "border-red-400/45 bg-red-500/12 text-red-400",
    purple: "border-violet-400/45 bg-violet-500/12 text-violet-400",
    orange: "border-orange-400/45 bg-orange-500/12 text-orange-400",
    pink: "border-pink-400/45 bg-pink-500/12 text-pink-400",
    teal: "border-teal-400/45 bg-teal-500/12 text-teal-400",
    cyan: "border-cyan-400/45 bg-cyan-500/12 text-cyan-400",
    gray: "border-zinc-400/45 bg-zinc-500/12 text-zinc-400",
  }

  return (
    <Card className={cn("col-span-12 md:col-span-4", className)}>
      <CardHeader>
        <CardTitle className="text-base">Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={statTileClass}>
            <div className={statLabelClass}>
              <ThumbsUp className="h-3.5 w-3.5" /> Upvotes
            </div>
            <div className={statValueClass}>{upvotes}</div>
          </div>
          <div className={statTileClass}>
            <div className={statLabelClass}>
              <MousePointerClick className="h-3.5 w-3.5" /> Clicks
            </div>
            <div className={statValueClass}>{clicks}</div>
          </div>
        </div>

        <div className={pillListClass}>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Recent upvoters</span>
            {!!upvoters.length && (
              <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                {upvoters.length}
              </span>
            )}
          </div>
          {upvoters.length ? (
            <div className="mt-2 flex -space-x-2">
              {upvoters.slice(0, 8).map((u) => (
                <Avatar
                  key={u.id}
                  className="ring-2 ring-background"
                  title={`${u.user.firstName} ${u.user.lastName || ""}`.trim()}
                >
                  <AvatarFallback>
                    {u.user.firstName?.[0] || "?"}
                    {u.user.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground">
              No upvotes yet - share your product to spark engagement.
            </div>
          )}
        </div>

        <div className={pillListClass}>
          <div className="text-xs text-muted-foreground">Active badges</div>
          {badges.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {badges.slice(0, 6).map((b) => {
                const left = daysLeft(b.expiresAt)
                const expiryText = b.expiresAt
                  ? `Expires ${new Date(b.expiresAt).toLocaleDateString()}${
                      left != null ? ` (${left}d left)` : ""
                    }`
                  : "No expiry"
                const def = BADGE_OPTIONS.find((o) => o.value === b.badge)
                const colorCls = def?.color
                  ? themedBadgeColorMap[def.color as TailwindColor]
                  : "border-[color:var(--brand-1)/0.22] bg-background/90 text-foreground/80"
                return (
                  <Tooltip key={b.id}>
                    <TooltipTrigger asChild>
                      <span className={cn(badgeChipBaseClass, colorCls)}>
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
            <div className="mt-2 text-xs text-muted-foreground">
              No badges assigned yet.
            </div>
          )}
        </div>

        <div className={seoPanelClass}>
          <div className="text-xs text-muted-foreground">SEO preview</div>
          <div className="mt-1 text-sm font-medium truncate text-foreground">
            {productName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {tagline || "Craft a punchy tagline to boost clicks."}
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            OG image:{" "}
            {ogImageUrl ? (
              <Link
                href={ogImageUrl}
                target="_blank"
                className="underline decoration-dotted"
              >
                {hasBanner ? "Banner" : "Logo"}
              </Link>
            ) : (
              <>Not set</>
            )}
          </div>
          <div className="mt-3">
            <Link
              href={editHref}
              className="inline-flex items-center gap-1 text-xs text-[color:var(--brand-1)] hover:underline"
            >
              <Sparkles className="h-3 w-3" /> Improve SEO
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
