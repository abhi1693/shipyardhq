import { ReactNode } from "react"
import Image from "next/image"
import { clickProductCardAction } from "@/actions/public/products/analytics"
import { Badge } from "@/components/atoms/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { Bell, Crown } from "lucide-react"
import { BADGE_OPTIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface ProductCompactCardProps {
  product: {
    id: string
    slug: string
    name: string
    logo: string
    tagline: string
  }
  upvotes?: number
  category?: string | null
  imagePriority?: boolean
  meta?: ReactNode
  showCategory?: boolean
  badges?: string[]
  showBadges?: boolean
  className?: string
  disableHoverEffects?: boolean
  sponsored?: boolean
  updatesCount?: number
}

export function ProductCompactCard({
  product,
  upvotes = 0,
  category,
  imagePriority = false,
  meta,
  showCategory = true,
  badges = [],
  showBadges = false,
  className,
  disableHoverEffects = false,
  sponsored = false,
  updatesCount = 0,
}: ProductCompactCardProps) {
  const badgeDescriptions: Record<string, string> = {
    featured: "Highlighted by the Shipyard team for outstanding execution",
    trending: "This product is currently trending with high engagement",
    new: "Recently launched and gaining its first wave of traction",
    "editor-pick": "Curated by the editors for its craftsmanship and polish",
  }

  const resolvedBadges = badges
    .map((value) => BADGE_OPTIONS.find((option) => option.value === value) ?? null)
    .filter((badge): badge is (typeof BADGE_OPTIONS)[number] => Boolean(badge))
  const badgeLimit = 2
  const visibleBadges = resolvedBadges.slice(0, badgeLimit).map((badge) => ({
    ...badge,
    description: badgeDescriptions[badge.value] ?? badge.label,
  }))
  const overflowBadges = resolvedBadges
    .slice(badgeLimit)
    .map((badge) => ({
      ...badge,
      description: badgeDescriptions[badge.value] ?? badge.label,
    }))

  const badgeColorMap: Record<string, string> = {
    yellow:
      "border-[#FACC15]/60 bg-[#FEF9C3] text-[#B45309] dark:border-[#FACC15]/40 dark:bg-[#422d0e] dark:text-[#FDE68A]",
    red:
      "border-[#FB923C]/60 bg-[#FFE4E6] text-[#B91C1C] dark:border-[#F97316]/40 dark:bg-[#451a0a] dark:text-[#FDBA74]",
    blue:
      "border-[#60A5FA]/60 bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#60A5FA]/40 dark:bg-[#102036] dark:text-[#93C5FD]",
    purple:
      "border-[#C084FC]/60 bg-[#F3E8FF] text-[#7C3AED] dark:border-[#C084FC]/35 dark:bg-[#2f1c47] dark:text-[#C084FC]",
  }

  const baseClasses =
    "group relative flex h-full w-full flex-col cursor-pointer rounded-xl border border-border/70 bg-card p-5 text-left text-card-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.18]"

  const hoverClasses = disableHoverEffects
    ? ""
    : "hover:-translate-y-[2px] hover:shadow-[0_28px_80px_-48px_rgba(7,68,134,0.45)]"

  return (
    <form
      action={clickProductCardAction}
      className="h-full"
      data-testid="product-compact-card"
    >
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="productSlug" value={product.slug} />
      <button
        type="submit"
        className={cn(baseClasses, hoverClasses, className)}
      >
        <div className="flex h-full flex-col gap-4">
          <div className="flex w-full flex-1 items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
              <Image
                src={product.logo}
                alt={product.name}
                width={40}
                height={40}
                className="h-full w-full object-cover"
                loading={imagePriority ? "eager" : "lazy"}
                fetchPriority={imagePriority ? "high" : "auto"}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="line-clamp-1 text-base font-semibold text-foreground">
                      {product.name}
                    </h3>
                    {sponsored ? (
                    <Badge className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Sponsored
                    </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {product.tagline}
                  </p>
                </div>
                {meta ? <div className="shrink-0">{meta}</div> : null}
              </div>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
            {showCategory && category ? (
              <Badge className="rounded-full border border-border/60 bg-neutral-100 px-3 py-1 text-xs font-medium text-foreground">
                {category}
              </Badge>
            ) : null}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-end justify-end gap-2">
                <div
                  className="flex h-14 w-12 flex-col items-center justify-center gap-1 rounded-lg border border-border/50 bg-white text-xs font-semibold text-muted-foreground"
                  title={`${updatesCount} updates`}
                >
                  <Bell className="h-4 w-4" aria-hidden fill="currentColor" />
                  <span className="text-sm font-semibold text-foreground">
                    {updatesCount}
                  </span>
                  <span className="sr-only">Updates</span>
                </div>
                <div
                  className="flex h-14 w-12 flex-col items-center justify-center gap-1 rounded-lg border border-border/50 bg-white text-xs font-semibold text-muted-foreground"
                  title={`${upvotes} upvotes`}
                >
                  <Crown className="h-4 w-4" aria-hidden fill="currentColor" />
                  <span className="text-sm font-semibold text-foreground">
                    {upvotes}
                  </span>
                  <span className="sr-only">Upvotes</span>
                </div>
              </div>
              {showBadges ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {visibleBadges.map((badge) => (
                    <Tooltip key={badge.value}>
                      <TooltipTrigger asChild>
                        <Badge
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold",
                            badgeColorMap[badge.color] ??
                              "border-primary/40 bg-primary/10 text-primary",
                          )}
                        >
                          <span aria-hidden className="text-sm leading-none">
                            {badge.icon}
                          </span>
                          {badge.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="end" className="text-xs">
                        {badge.description}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {overflowBadges.length > 0 ? (
                    <span
                      key="badge-overflow"
                      className="inline-flex items-center justify-center rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground"
                      title={overflowBadges.map((badge) => badge.label).join(", ")}
                    >
                      +{overflowBadges.length}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </button>
    </form>
  )
}
