import Link from "next/link"

import { ProductCompactCard } from "@/components/molecules/ProductCompactCard"
import { type CompactProductItem } from "@/components/molecules/ProductCompactGrid"
import { productPageCopy } from "@/lib/copy/productPage"

interface ProductSimilarVoyagesProps<T extends CompactProductItem> {
  items: T[]
  headingSuffix?: string | null
  browseHref: string
}

export function ProductSimilarVoyages<T extends CompactProductItem>({
  items,
  headingSuffix,
  browseHref,
}: ProductSimilarVoyagesProps<T>) {
  if (!items.length) {
    return null
  }

  const { recommendations } = productPageCopy

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            {recommendations.eyebrow}
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            {recommendations.headingPrefix} {headingSuffix ?? "explore"}
          </h3>
        </div>
        <Link
          href={browseHref}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-1 text-sm font-semibold text-muted-foreground transition hover:border-border hover:text-foreground"
        >
          {recommendations.ctaLabel}
          <span aria-hidden>↗</span>
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.slice(0, 4).map((item, index) => (
          <ProductCompactCard
            key={item.id}
            product={{
              id: item.id,
              slug: item.slug,
              name: item.name,
              logo: item.logo,
              tagline: item.tagline,
            }}
            upvotes={item.analytics?.upvotes ?? 0}
            category={item.category?.name ?? null}
            imagePriority={index === 0}
            showCategory={false}
            disableHoverEffects
            className="border border-border/60 bg-background/90 p-3 shadow-none"
          />
        ))}
      </div>
    </section>
  )
}
