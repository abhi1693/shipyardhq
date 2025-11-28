"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"
import Link from "next/link"
import { ThumbsUp, Star, Sparkles } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { BADGE_OPTIONS } from "@/lib/constants"
import { TailwindColor, cn } from "@/lib/utils"
import RatingStars from "@/components/molecules/RatingStars"
import { formatDistanceToNow } from "date-fns"

type Upvoter = {
  id: string
  user: { firstName: string; lastName?: string | null }
}

type BadgeItem = { id: string; badge: string; expiresAt: string | Date | null }

export default function PerformanceCard({
  upvotes = 0,
  upvoters = [],
  badges = [],
  productName,
  tagline,
  hasBanner,
  ogImageUrl,
  editHref,
  className,
  reviewAverage,
  reviewCount,
  recentReviews = [],
}: {
  upvotes?: number
  upvoters?: Upvoter[]
  badges?: BadgeItem[]
  productName: string
  tagline?: string | null
  hasBanner?: boolean
  ogImageUrl?: string | null
  editHref: string
  className?: string
  reviewAverage?: number | null
  reviewCount?: number | null
  recentReviews?: {
    id: string
    rating: number
    message: string
    createdAt: string
    reviewer: string
  }[]
}) {
  const statTileClass =
    "rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-center"
  const statLabelClass =
    "inline-flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
  const statValueClass = "text-2xl font-semibold text-foreground"
  const pillListClass =
    "rounded-lg border border-slate-200 bg-white px-4 py-3 text-muted-foreground"
  const badgeChipBaseClass =
    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
  const seoPanelClass =
    "rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-muted-foreground"

  const themedBadgeColorMap: Record<TailwindColor, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    yellow: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    purple: "border-violet-200 bg-violet-50 text-violet-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    pink: "border-pink-200 bg-pink-50 text-pink-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    gray: "border-slate-200 bg-slate-50 text-slate-700",
  }

  const hasReviewStats =
    typeof reviewAverage === "number" &&
    reviewAverage > 0 &&
    (reviewCount || 0) > 0

  return (
    <Card className={cn("col-span-12 md:col-span-4", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "grid gap-3",
            hasReviewStats ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2",
          )}
        >
          <div className={statTileClass}>
            <div className={statLabelClass}>
              <ThumbsUp className="h-3.5 w-3.5" /> Upvotes
            </div>
            <div className={statValueClass}>{upvotes}</div>
          </div>
          {hasReviewStats && (
            <div className={statTileClass}>
              <div className={statLabelClass}>
                <Star className="h-3.5 w-3.5" /> Rating
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-lg font-semibold text-foreground">
                  {reviewAverage?.toFixed(1)} / 5
                </div>
                <RatingStars rating={reviewAverage ?? 0} size={14} />
                <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={pillListClass}>
          <div className="flex items-center justify-between text-xs">
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
            <div className="mt-2 text-xs">
              <span>No recent upvotes</span>
              <span className="text-muted-foreground/80">
                {" "}
                — share your product to spark engagement.
              </span>
            </div>
          )}
        </div>

        {hasReviewStats ? (
          <div className={pillListClass}>
            <div className="flex items-center justify-between text-xs">
              <span>Recent reviews</span>
              {typeof reviewCount === "number" ? (
                <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {reviewCount} total
                </span>
              ) : null}
            </div>
            {recentReviews.length ? (
              <ul className="mt-2 space-y-2 text-xs">
                {recentReviews.slice(0, 3).map((review) => (
                  <li
                    key={review.id}
                    className="rounded-md border border-slate-200 bg-white/80 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {review.reviewer}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {(() => {
                          try {
                            return formatDistanceToNow(
                              new Date(review.createdAt),
                              {
                                addSuffix: true,
                              },
                            )
                          } catch {
                            return "Recently"
                          }
                        })()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <RatingStars rating={review.rating} size={12} />
                      <span className="text-[11px] text-muted-foreground">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      {review.message}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-xs">
                <span>No public reviews yet.</span>
              </div>
            )}
          </div>
        ) : null}

        <div className={pillListClass}>
          <div className="text-xs">Active badges</div>
          {badges.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {badges.slice(0, 6).map((b) => {
                const expiryDate = b.expiresAt ? new Date(b.expiresAt) : null
                const isValidExpiry = Boolean(
                  expiryDate && !Number.isNaN(expiryDate.getTime()),
                )
                const relativeExpiry =
                  isValidExpiry && expiryDate
                    ? formatDistanceToNow(expiryDate, { addSuffix: true })
                    : null
                const expiryText =
                  isValidExpiry && expiryDate
                    ? `Expires ${expiryDate.toLocaleDateString()}${
                        relativeExpiry ? ` · ${relativeExpiry}` : ""
                      }`
                    : "No expiry"
                const def = BADGE_OPTIONS.find((o) => o.value === b.badge)
                const colorCls = def?.color
                  ? themedBadgeColorMap[def.color as TailwindColor]
                  : "border-slate-200 bg-white text-slate-700"
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
            <div className="mt-2 text-xs">
              <span>No badges</span>
              <span className="text-muted-foreground/80"> assigned yet.</span>
            </div>
          )}
        </div>

        <div className={seoPanelClass}>
          <div className="text-xs">SEO preview</div>
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
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Sparkles className="h-3 w-3" /> Improve SEO
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
