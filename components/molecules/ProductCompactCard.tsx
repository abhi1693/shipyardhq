import { ReactNode } from "react"
import Image from "next/image"
import { clickProductCardAction } from "@/actions/public/products/analytics"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"
import { Badge } from "@/components/atoms/badge"
import { BADGE_OPTIONS } from "@/lib/constants"

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
}: ProductCompactCardProps) {
  const resolvedBadges = badges
    .map(
      (value) => BADGE_OPTIONS.find((option) => option.value === value) ?? null,
    )
    .filter((badge): badge is (typeof BADGE_OPTIONS)[number] => Boolean(badge))

  const badgeLimit = 3
  const visibleBadges = resolvedBadges.slice(0, badgeLimit)
  const extraBadgeCount = Math.max(0, badges.length - visibleBadges.length)
  const showMetaRow = showCategory && category

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
        className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background/98 via-background/94 to-[color:var(--brand-1)/0.03] p-4 text-left text-card-foreground shadow-[0px_14px_46px_-46px_rgba(7,58,104,0.5)] ring-1 ring-inset ring-white/10 transition-all duration-300 before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(115%_115%_at_50%_0%,var(--brand-1)/0.17,transparent_72%)] before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.22] hover:bg-background/98 hover:shadow-[0px_26px_78px_-56px_rgba(7,58,104,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.22] group-hover:before:opacity-100 dark:border-white/14"
      >
        {meta ? (
          <div className="absolute right-4 top-3 sm:top-4">{meta}</div>
        ) : null}
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
                priority={imagePriority}
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
                {product.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {product.tagline}
              </p>
            </div>
          </div>

          {showBadges && (visibleBadges.length > 0 || extraBadgeCount > 0) ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleBadges.map((badge, index) => (
                <Badge
                  key={`${badge.value}-${index}`}
                  title={badge.label}
                  className="rounded-full border-transparent bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-[10px] font-medium text-[color:var(--brand-1)] shadow-[0px_14px_28px_-26px_rgba(7,58,104,0.78)] ring-1 ring-inset ring-white/5"
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

          <div className="mt-auto flex items-center justify-between pt-1">
            <UpvoteSquare
              count={upvotes}
              compact
              className="shrink-0"
              title={`${upvotes} upvotes`}
            />

            {showMetaRow ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-[11px] font-medium text-[color:var(--brand-1)] shadow-[0px_12px_32px_-28px_rgba(7,58,104,0.75)] ring-1 ring-inset ring-white/10">
                {category}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </form>
  )
}
