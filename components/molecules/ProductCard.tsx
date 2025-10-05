import { clickProductCardAction } from "@/actions/public/products/analytics"
import Image from "next/image"
import clsx from "clsx"

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/atoms/card"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"
import { ProductAuthor } from "@/components/molecules/ProductAuthor"
import { Badge } from "@/components/atoms/badge"
import { BADGE_OPTIONS } from "@/lib/constants"

interface ProductCardProps {
  product: {
    id: string
    slug: string
    name: string
    logo: string
    tagline: string
  }
  badges?: string[]
  upvotes?: number
  author?: {
    name: string
    initial: string
  }
  category?: string
  compact?: boolean
  topRight?: React.ReactNode
  imagePriority?: boolean
}

export function ProductCard({
  product,
  badges = [],
  upvotes = 0,
  author,
  category,
  compact = false,
  topRight,
  imagePriority = false,
}: ProductCardProps) {
  const resolvedBadges = badges
    .map(
      (value) => BADGE_OPTIONS.find((option) => option.value === value) ?? null,
    )
    .filter((badge): badge is (typeof BADGE_OPTIONS)[number] => Boolean(badge))

  const compactBadgeLimit = 3
  const compactBadges = resolvedBadges.slice(0, compactBadgeLimit)
  const extraBadgeCount = compact
    ? Math.max(0, badges.length - compactBadges.length)
    : 0

  return (
    <form action={clickProductCardAction} className="h-full">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="productSlug" value={product.slug} />
      <button
        type="submit"
        className="group block h-full w-full text-left focus-visible:outline-none focus-visible:ring-0"
      >
        <Card
          className={clsx(
            "relative h-full overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.1] bg-gradient-to-br from-background/98 via-background/92 to-[color:var(--brand-1)/0.05] text-foreground shadow-[0px_20px_60px_-48px_rgba(7,58,104,0.52)] ring-1 ring-inset ring-white/12 transition-all duration-300 ease-out backdrop-blur-sm dark:border-white/14",
            "cursor-pointer group-hover:-translate-y-1.5 group-hover:border-[color:var(--brand-1)/0.16] group-hover:shadow-[0px_28px_82px_-54px_rgba(7,58,104,0.66)] group-focus-visible:-translate-y-1.5 group-focus-visible:border-[color:var(--brand-1)/0.16] group-focus-visible:shadow-[0px_28px_82px_-54px_rgba(7,58,104,0.66)]",
            compact ? "gap-4 py-4" : "gap-5 py-6",
          )}
        >
          {topRight && (
            <div className="absolute right-4 top-4 z-10">{topRight}</div>
          )}
          <CardHeader
            className={clsx("relative", compact ? "px-4 pb-2" : "px-6 pb-3")}
          >
            <div
              className={clsx("flex items-start", compact ? "gap-3" : "gap-4")}
            >
              <div
                className={clsx(
                  "flex-shrink-0 overflow-hidden rounded-xl bg-[color:var(--brand-1)/0.12] shadow-[0px_22px_40px_-34px_rgba(7,58,104,0.9)] ring-1 ring-inset ring-white/5",
                  compact ? "h-10 w-10" : "h-16 w-16",
                )}
              >
                <Image
                  src={product.logo}
                  alt={product.name}
                  width={compact ? 40 : 64}
                  height={compact ? 40 : 64}
                  className="h-full w-full object-cover"
                  loading={imagePriority ? "eager" : "lazy"}
                  priority={imagePriority}
                />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={clsx(
                      "font-semibold leading-tight text-foreground",
                      compact ? "text-sm" : "text-base",
                    )}
                  >
                    {product.name}
                  </CardTitle>
                  {category && !compact && (
                    <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-1)/0.12] px-3 py-1 text-[11px] font-medium text-[color:var(--brand-1)] shadow-[0px_15px_35px_-30px_rgba(7,58,104,0.75)]">
                      {category}
                    </span>
                  )}
                </div>

                <p
                  className={clsx(
                    "text-muted-foreground",
                    compact ? "line-clamp-2 text-xs" : "line-clamp-2 text-sm",
                  )}
                >
                  {product.tagline}
                </p>

                {!compact && resolvedBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-3">
                    {resolvedBadges.map((badge, i) => (
                      <Badge
                        key={`${badge.value}-${i}`}
                        title={badge.label}
                        className={clsx(
                          "rounded-full border-transparent bg-[color:var(--brand-1)/0.12] px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-1)] shadow-[0px_14px_32px_-28px_rgba(7,58,104,0.8)] ring-1 ring-inset ring-white/5",
                        )}
                        variant="outline"
                      >
                        {badge.icon}
                        <span className="ml-1">{badge.label}</span>
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {compact &&
                (compactBadges.length > 0 || extraBadgeCount > 0) ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {compactBadges.map((badge, i) => (
                      <Badge
                        key={`${badge.value}-${i}`}
                        title={badge.label}
                        className={clsx(
                          "rounded-full border-transparent bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-[10px] font-medium text-[color:var(--brand-1)] shadow-[0px_14px_28px_-26px_rgba(7,58,104,0.78)] ring-1 ring-inset ring-white/5",
                        )}
                        variant="outline"
                      >
                        {badge.icon}
                        <span className="ml-1 font-medium">{badge.label}</span>
                      </Badge>
                    ))}
                    {extraBadgeCount > 0 ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        +{extraBadgeCount}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className={clsx(compact ? "px-4 pt-3" : "px-6 pt-4")}>
            <div
              className={clsx(
                "flex items-center justify-between",
                compact ? "gap-2" : "gap-3",
              )}
            >
              <UpvoteSquare
                count={upvotes}
                compact={compact}
                className={clsx(compact ? "-ml-1" : "ml-1")}
              />

              {author ? (
                <ProductAuthor
                  name={author.name}
                  initial={author.initial}
                  compact={compact}
                  className="text-foreground"
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </button>
    </form>
  )
}
