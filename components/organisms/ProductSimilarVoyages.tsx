import Link from "next/link"

import {
  ProductCompactGrid,
  type CompactProductItem,
} from "@/components/molecules/ProductCompactGrid"
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
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
            {recommendations.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            {recommendations.headingPrefix} {headingSuffix ?? "explore"}
          </h2>
        </div>
        <Link
          href={browseHref}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[color:var(--brand-1)] ring-1 ring-slate-200/40 transition hover:ring-[color:var(--brand-1)/0.35] dark:bg-slate-900 dark:ring-slate-800/40"
        >
          {recommendations.ctaLabel}
          <span aria-hidden>↗</span>
        </Link>
      </div>
      <ProductCompactGrid
        items={items}
        className="gap-4"
        showCategory={false}
      />
    </section>
  )
}
