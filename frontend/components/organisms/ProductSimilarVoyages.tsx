import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { ProductCard } from "@/components/molecules/ProductCard"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { productPageCopy } from "@/lib/copy/productPage"

interface ProductSimilarVoyagesProps<T extends ProductCardBase> {
  items: T[]
  headingSuffix?: string | null
  browseHref: string
}

export function ProductSimilarVoyages<T extends ProductCardBase>({
  items,
  headingSuffix,
  browseHref,
}: ProductSimilarVoyagesProps<T>) {
  if (!items.length) {
    return null
  }

  const { recommendations } = productPageCopy

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
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
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <span>{recommendations.ctaLabel}</span>
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.slice(0, 4).map((item) => (
          <ProductCard key={item.id} product={toProductCardItem(item)} />
        ))}
      </div>
    </section>
  )
}
