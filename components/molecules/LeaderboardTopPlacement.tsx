import React from "react"
import Link from "next/link"
import Medal from "@/components/atoms/Medal"
import { cn } from "@/lib/utils"
import { productPath } from "@/lib/routes"
import { IconAnchor } from "@tabler/icons-react"
import { SquareImage } from "@/components/molecules/SquareImage"

export type LeaderboardPlacementProduct = {
  slug: string
  name: string
  tagline: string
  logo?: string | null
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null } | null
  user?: { firstName?: string | null; lastName?: string | null } | null
}

export function TopPlacementCard({
  product,
  rank,
  label,
  className,
  meta,
  upvotesOverride,
  upvotesLabel = "upvotes",
}: {
  product: LeaderboardPlacementProduct
  rank: number
  label: string
  className?: string
  meta?: React.ReactNode
  upvotesOverride?: number | null
  upvotesLabel?: string
}) {
  const upvotes = upvotesOverride ?? product.analytics?.upvotes ?? 0
  const authorName =
    `${product.user?.firstName ?? ""} ${product.user?.lastName ?? ""}`.trim() ||
    "Unknown maker"
  const categoryName = product.category?.name ?? ""
  const fallbackMeta = (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
      <IconAnchor className="h-3.5 w-3.5 text-[color:var(--brand-1)]" />
      Rank #{rank}
    </span>
  )

  const headlineMeta = meta ? (
    <div className="flex items-center gap-2">{meta}</div>
  ) : (
    fallbackMeta
  )

  return (
    <Link
      href={productPath(product.slug)}
      className={cn(
        "group relative flex h-full flex-col gap-7 overflow-hidden rounded-3xl border border-border/60 bg-background/95 p-6 shadow-[0px_26px_70px_-54px_rgba(7,58,104,0.6)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.25] hover:shadow-[0px_36px_110px_-62px_rgba(7,78,134,0.55)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)/0.12] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-1)]">
          <Medal rank={Math.min(rank, 3) as 1 | 2 | 3} />
          {label}
        </span>
        {headlineMeta}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/60 shadow-[0_22px_50px_-40px_rgba(7,78,134,0.55)]">
            {product.logo ? (
              <SquareImage
                src={product.logo}
                alt={product.name}
                size={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-[color:var(--brand-1)]">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-semibold tracking-tight text-foreground">
                {product.name}
              </p>
              {categoryName ? (
                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {categoryName}
                </span>
              ) : null}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {product.tagline}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <span className="inline-flex items-center justify-end gap-2 rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.12] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
            {upvotes.toLocaleString()} {upvotesLabel}
          </span>
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            Maker
          </div>
          <div className="text-sm font-medium text-foreground leading-tight">
            {authorName}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            Rank #{rank}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs text-muted-foreground transition-colors group-hover:border-[color:var(--brand-1)/0.28] group-hover:bg-muted/60">
        <span className="inline-flex items-center gap-2 uppercase tracking-[0.26em]">
          <IconAnchor className="h-4 w-4 text-[color:var(--brand-1)]" />
          Still climbing
        </span>
        <span className="text-sm font-semibold text-foreground">
          View launch profile
        </span>
      </div>
    </Link>
  )
}
