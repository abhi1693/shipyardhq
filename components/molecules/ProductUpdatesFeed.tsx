import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Megaphone } from "lucide-react"

import { SquareImage } from "@/components/molecules/SquareImage"
import type { ProductUpdateFeedItem } from "@/types/product-updates"
import { cn } from "@/lib/utils"
import { BROWSE_PATH, productPath } from "@/lib/routes"
import { ProductClickLink } from "@/components/molecules/ProductClickLink"

type ProductUpdatesFeedProps = {
  updates: ProductUpdateFeedItem[]
  className?: string
}

export function ProductUpdatesFeed({
  updates,
  className,
}: ProductUpdatesFeedProps) {
  if (!updates.length) return null

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-white p-5 shadow-sm",
        className,
      )}
      aria-labelledby="product-updates-feed-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          id="product-updates-feed-heading"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <Megaphone
            className="h-4 w-4 text-sky-600"
            aria-hidden
            fill="currentColor"
            strokeWidth={1.75}
          />
          Product updates
        </h3>
        <span className="text-xs text-muted-foreground">
          {updates.length} new
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {updates.map((update) => {
          const productUrl = productPath(update.product.slug)
          const publishedLabel = update.publishedAt
            ? formatDistanceToNow(new Date(update.publishedAt), {
                addSuffix: true,
              })
            : formatDistanceToNow(new Date(update.createdAt), {
                addSuffix: true,
              })

          return (
            <ProductClickLink
              key={update.id}
              productSlug={update.product.slug}
              href={productUrl}
              formClassName="block"
              className="flex gap-3 rounded-xl border border-border/70 bg-white/95 p-3 shadow-xs transition hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {update.product.logo ? (
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-white">
                  <SquareImage
                    src={update.product.logo}
                    alt={`${update.product.name} logo`}
                    size={40}
                    className="h-9 w-9 rounded-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-border/60 bg-white text-xs font-semibold uppercase text-muted-foreground">
                  {update.product.name.slice(0, 2)}
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-semibold text-foreground line-clamp-2">
                  {update.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {update.product.name} • {publishedLabel}
                </span>
                {update.summary ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {update.summary}
                  </p>
                ) : update.product.tagline ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {update.product.tagline}
                  </p>
                ) : null}
              </div>
            </ProductClickLink>
          )
        })}
      </div>

      <div className="mt-5">
        <Link
          href={`${BROWSE_PATH}?sort=new`}
          className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
        >
          Browse all product updates
        </Link>
      </div>
    </section>
  )
}
