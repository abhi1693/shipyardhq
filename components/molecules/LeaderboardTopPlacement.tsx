import React from "react"
import Link from "next/link"
import Image from "next/image"
import Medal from "@/components/atoms/Medal"
import { cn } from "@/lib/utils"
import { productPath } from "@/lib/routes"
import { IconAnchor } from "@tabler/icons-react"

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
  const gradients = [
    "linear-gradient(140deg, rgba(7, 58, 104, 0.22) 0%, rgba(7, 58, 104, 0.05) 65%)",
    "linear-gradient(140deg, rgba(6, 47, 90, 0.18) 0%, rgba(6, 47, 90, 0.04) 70%)",
    "linear-gradient(140deg, rgba(5, 40, 76, 0.16) 0%, rgba(5, 40, 76, 0.04) 72%)",
  ]

  return (
    <Link
      href={productPath(product.slug)}
      className={cn(
        "group relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/92 p-6 shadow-[0px_28px_70px_-48px_rgba(7,58,104,0.6)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_32px_90px_-60px_rgba(7,78,134,0.55)]",
        className,
      )}
      style={{ backgroundImage: gradients[(rank - 1) % gradients.length] }}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
        <span className="inline-flex items-center gap-2">
          <Medal rank={Math.min(rank, 3) as 1 | 2 | 3} />
          {label}
        </span>
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <IconAnchor className="h-4 w-4" />
          Rank #{rank}
        </span>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.25] bg-background/75">
            {product.logo ? (
              <Image
                src={product.logo}
                alt={product.name}
                width={64}
                height={64}
                className="h-16 w-16 object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-[color:var(--brand-1)]">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-xl font-semibold text-foreground">
                {product.name}
              </p>
              {categoryName ? (
                <span className="inline-flex items-center rounded-full border border-[color:var(--brand-1)/0.3] bg-background/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                  {categoryName}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.tagline}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 text-right text-xs">
          <span className="inline-flex items-center rounded-full border border-[color:var(--brand-1)/0.3] bg-background/70 px-3 py-1 font-semibold tracking-[0.28em] text-[color:var(--brand-1)]">
            {upvotes.toLocaleString()} {upvotesLabel}
          </span>
          <div className="flex flex-col text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            <span>Maker</span>
            <span className="text-xs text-foreground">{authorName}</span>
          </div>
        </div>
      </div>

      {meta}
    </Link>
  )
}
