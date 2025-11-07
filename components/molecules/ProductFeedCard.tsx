"use client"

import Image from "next/image"
import { type ReactNode } from "react"

import { ArrowUpRight, Flame } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { VoteCount } from "@/components/molecules/VoteCount"
import { ProductClickLink } from "@/components/molecules/ProductClickLink"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { cn } from "@/lib/utils"
import { BADGE_OPTIONS } from "@/lib/constants"
import type { ProductCardVariant } from "@/types/product-card"

const LOGO_SIZE = 60

const CARD_VARIANT_CLASSES: Record<ProductCardVariant, string> = {
  default:
    "border-2 border-border/70 bg-card shadow-[4px_12px_28px_-20px_rgba(7,68,134,0.26)] hover:shadow-[14px_30px_60px_-34px_rgba(7,68,134,0.45)]",
  sponsored:
    "border-2 border-[#F59E0B]/45 bg-[#FFF7ED] shadow-[4px_12px_28px_-20px_rgba(226,120,34,0.26)] hover:shadow-[14px_30px_60px_-34px_rgba(226,120,34,0.45)]",
  promoted:
    "border-2 border-[#FCD34D]/60 bg-[#FEF3C7] shadow-[4px_12px_28px_-20px_rgba(217,119,6,0.26)] hover:shadow-[14px_30px_60px_-34px_rgba(217,119,6,0.45)]",
}

const resolveVariant = ({
  variant,
  itemVariant,
  isSponsored,
}: {
  variant?: ProductCardVariant
  itemVariant?: ProductCardVariant
  isSponsored: boolean
}): ProductCardVariant => {
  if (variant) return variant
  if (itemVariant) return itemVariant
  return isSponsored ? "sponsored" : "default"
}

interface ProductFeedCardProps {
  item: HomepageFeedItem
  className?: string
  meta?: ReactNode
  variant?: ProductCardVariant
}

export function ProductFeedCard({
  item,
  className,
  meta,
  variant,
}: ProductFeedCardProps) {
  const cardVariant = resolveVariant({
    variant,
    itemVariant: item.variant,
    isSponsored: item.isSponsored,
  })

  const cardClasses = cn(
    "group relative flex h-full flex-col rounded-2xl p-5 text-left transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.18]",
    CARD_VARIANT_CLASSES[cardVariant],
    className,
  )

  const badgePresentation = (() => {
    switch (cardVariant) {
      case "sponsored":
        return {
          label: "Sponsored",
          className:
            "rounded-full border border-[#F97316]/40 bg-[#FDEADF] px-2 py-0.5 text-[11px] font-semibold text-[#A33105]",
          Icon: Flame,
        }
      case "promoted":
        return null
      default:
        return null
    }
  })()

  const tagline =
    item.tagline?.trim() ||
    "Discover launch-ready tools from indie makers worldwide."

  const badgeColorMap: Record<string, string> = {
    yellow:
      "border-[#F59E0B]/50 bg-[#FEF3C7] text-[#B45309] dark:border-[#F59E0B]/40 dark:bg-[#422d0e] dark:text-[#FDE68A]",
    red: "border-[#FB923C]/55 bg-[#FFE4E6] text-[#B91C1C] dark:border-[#F97316]/40 dark:bg-[#451a0a] dark:text-[#FDBA74]",
    blue: "border-[#60A5FA]/55 bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#60A5FA]/40 dark:bg-[#102036] dark:text-[#93C5FD]",
    purple:
      "border-[#C084FC]/50 bg-[#F3E8FF] text-[#7C3AED] dark:border-[#C084FC]/35 dark:bg-[#2f1c47] dark:text-[#C084FC]",
  }

  const badgeDescriptions: Record<string, string> = {
    featured: "Highlighted by the Shipyard team for outstanding execution",
    trending: "This product is currently trending with high engagement",
    new: "Recently launched and gaining its first wave of traction",
    "editor-pick": "Curated by the editors for its craftsmanship and polish",
  }

  const resolvedBadges = item.badges.map((rawBadge, index) => {
    const normalized = rawBadge.trim()
    const match = BADGE_OPTIONS.find((option) => {
      const valueMatch = option.value.toLowerCase() === normalized.toLowerCase()
      const labelMatch = option.label.toLowerCase() === normalized.toLowerCase()
      return valueMatch || labelMatch
    })

    return {
      key: `${item.id}-${normalized}-${index}`,
      label: match?.label ?? normalized,
      icon: match?.icon ?? null,
      colorClass: match ? badgeColorMap[match.color] : undefined,
      value: (match?.value ?? normalized).toLowerCase(),
    }
  })
  const hasBadges = resolvedBadges.length > 0

  const voteCount =
    typeof item.voteCount === "number" && Number.isFinite(item.voteCount)
      ? item.voteCount
      : 0
  const cardContent = (
    <article className="flex flex-1 flex-col gap-4">
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/40">
            {item.logo ? (
              <Image
                src={item.logo}
                alt={`${item.name} logo`}
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-foreground">
                {item.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="line-clamp-1 text-base font-semibold text-foreground">
                {item.name}
              </h2>
              {badgePresentation ? (
                <Badge className={badgePresentation.className}>
                  <badgePresentation.Icon
                    className="h-3 w-3"
                    aria-hidden="true"
                  />{" "}
                  {badgePresentation.label}
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {tagline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {meta ? <span className="shrink-0">{meta}</span> : null}
          <VoteCount
            count={voteCount}
            title={`${voteCount} upvotes`}
            compact
            className="border-border/50 bg-background px-3 py-1.5 text-xs shadow-none transition-colors"
            active={Boolean(item.isVoted)}
          />
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
        {item.category ? (
          <span className="inline-flex items-center rounded-full border border-border/60 bg-neutral-100 px-3 py-1 text-xs font-semibold text-foreground">
            {item.category}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Uncategorized</span>
        )}
        <div className="flex flex-col items-end gap-2">
          {hasBadges ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {resolvedBadges.map((badge) => (
                <Tooltip key={badge.key}>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold",
                        badge.colorClass ??
                          "border-primary/30 bg-primary/10 text-primary",
                      )}
                    >
                      {badge.icon ? (
                        <span aria-hidden className="text-sm leading-none">
                          {badge.icon}
                        </span>
                      ) : (
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      )}
                      {badge.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end" className="text-xs">
                    {badgeDescriptions[badge.value] ?? badge.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )

  return (
    <ProductClickLink
      productId={item.id}
      productSlug={item.slug}
      className={cardClasses}
      data-testid="homepage-feed-card"
      formProps={{
        className: "h-full",
        "data-testid": "homepage-feed-card-form",
      }}
    >
      {cardContent}
    </ProductClickLink>
  )
}

export default ProductFeedCard
