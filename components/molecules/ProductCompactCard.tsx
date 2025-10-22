import { ReactNode } from "react"
import Image from "next/image"
import { clickProductCardAction } from "@/actions/public/products/analytics"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"
import { Badge } from "@/components/atoms/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
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
}: ProductCompactCardProps) {
  const resolvedBadges = badges
    .map(
      (value) => BADGE_OPTIONS.find((option) => option.value === value) ?? null,
    )
    .filter((badge): badge is (typeof BADGE_OPTIONS)[number] => Boolean(badge))

  const badgeLimit = 2
  const visibleBadges = resolvedBadges.slice(0, badgeLimit)
  const overflowBadges = resolvedBadges.slice(badgeLimit)
  const showDockLabel = showCategory && category
  const dockLabel = showDockLabel
    ? (category ?? "Launch ready")
    : "View details"

  const baseClasses =
    "group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-border/30 bg-card/[0.98] p-4 text-left text-card-foreground shadow-[0_26px_70px_-48px_rgba(7,58,104,0.62)] ring-1 ring-inset ring-white/10 transition-all duration-300 before:absolute before:inset-[-12%] before:-z-10 before:rounded-[2rem] before:bg-[radial-gradient(160%_190%_at_32%_-28%,oklch(0.86_0.1_232_/0.6),transparent_66%),radial-gradient(140%_200%_at_88%_128%,oklch(0.93_0.08_45_/0.52),transparent_74%)] before:opacity-90 before:blur-[46px] before:transition-all before:duration-500 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.18] dark:border-white/14"

  const hoverClasses = disableHoverEffects
    ? ""
    : "hover:-translate-y-1 hover:scale-[1.015] hover:border-[color:var(--brand-1)/0.24] hover:bg-[color:var(--brand-1)/0.03] hover:shadow-[0_36px_110px_-62px_rgba(7,58,104,0.68)] hover:ring-[1.5px] hover:ring-[color:var(--brand-1)/0.22] group-hover:before:opacity-100"

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
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--brand-1)/0.12] shadow-[0px_18px_38px_-30px_rgba(7,58,104,0.85)] ring-1 ring-inset ring-white/10">
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
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
                    {product.name}
                  </h3>
                </div>
                {meta ? <div className="shrink-0">{meta}</div> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {product.tagline}
              </p>
            </div>
          </div>

          {showBadges &&
          (visibleBadges.length > 0 || overflowBadges.length > 0) ? (
            <div className="flex flex-wrap items-center gap-2">
              {visibleBadges.map((badge) => (
                <Tooltip key={badge.value}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="inline-flex h-7 w-9 items-center justify-center rounded-full border-[color:var(--brand-1)/0.22] bg-[color:var(--brand-1)/0.12] p-0 text-[color:var(--brand-1)] shadow-[0_16px_26px_-30px_rgba(7,58,104,0.75)] transition-colors hover:border-[color:var(--brand-1)/0.35]"
                    >
                      <span aria-hidden className="text-base leading-none">
                        {badge.icon}
                      </span>
                      <span className="sr-only">{badge.label}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6} className="text-xs">
                    {badge.label}
                  </TooltipContent>
                </Tooltip>
              ))}
              {overflowBadges.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-7 items-center justify-center rounded-full border border-border/50 bg-muted/50 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-border/70">
                      +{overflowBadges.length}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    sideOffset={6}
                    className="max-w-[16rem] text-xs"
                  >
                    <div className="space-y-1">
                      {overflowBadges.map((badge) => (
                        <div key={badge.value}>{badge.label}</div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto pt-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors group-hover:border-[color:var(--brand-1)/0.24] group-hover:bg-muted/55">
              <span className="line-clamp-1 leading-none">{dockLabel}</span>
              <UpvoteSquare
                count={upvotes}
                compact
                className="shrink-0"
                title={`${upvotes} upvotes`}
              />
            </div>
          </div>
        </div>
      </button>
    </form>
  )
}
