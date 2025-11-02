"use client"

import { useMemo, useState } from "react"
import InlineSelect from "@/components/molecules/InlineSelect"
import ProductGrid from "@/components/molecules/ProductGrid"
import { toProductCardItem } from "@/lib/products/card-item"
import { createStaticProductPager } from "@/lib/products/pagination"
import { cn } from "@/lib/utils"

type ProductForCard = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  createdAt: string | Date
  // whether product should be pinned first based on plan feature
  priority?: boolean
  badges?: string[]
  analytics?: { upvotes: number; clicks: number } | null
  user?: { firstName: string | null; lastName: string | null } | null
  category?: { name: string } | null
}

type Props = {
  products: ProductForCard[]
  title?: string
  description?: string
  className?: string
}

type SortKey = "newest" | "upvotes" | "clicks" | "name"

const CATEGORY_GRID_PAGE_SIZE = 12

export function CategoryProductsClient({
  products,
  title = "Products",
  description = "Sort to surface fresh launches, rising favorites, or the most clicks.",
  className,
}: Props) {
  const [sort, setSort] = useState<SortKey>("newest")

  const productKey = useMemo(
    () => products.map((product) => product.id).join("|"),
    [products],
  )

  const sorted = useMemo(() => {
    const items = [...products]

    // Split into priority vs regular; priority always shown first
    const priority = items.filter((p) => p.priority)
    const regular = items.filter((p) => !p.priority)

    const sortFn = (a: ProductForCard, b: ProductForCard) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name)
        case "upvotes":
          return (b.analytics?.upvotes || 0) - (a.analytics?.upvotes || 0)
        case "clicks":
          return (b.analytics?.clicks || 0) - (a.analytics?.clicks || 0)
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      }
    }

    priority.sort(sortFn)
    regular.sort(sortFn)

    return [...priority, ...regular]
  }, [products, sort])

  const { initialItems, initialHasMore, loadPage } = useMemo(() => {
    const pager = createStaticProductPager(sorted, {
      pageSize: CATEGORY_GRID_PAGE_SIZE,
      mapItem: (item) => toProductCardItem(item),
    })
    return pager
  }, [sorted])

  return (
    <section
      className={cn(
        "rounded-3xl border border-border/50 bg-white px-6 py-8 shadow-[0_24px_80px_-60px_rgba(7,58,104,0.4)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <InlineSelect
            value={sort}
            onValueChange={(v) => setSort(v as SortKey)}
            placeholder="Select sort"
            options={[
              { value: "newest", label: "Newest" },
              { value: "upvotes", label: "Most Upvoted" },
              { value: "clicks", label: "Most Clicked" },
              { value: "name", label: "Name (A–Z)" },
            ]}
            triggerClassName="h-9 w-[180px] cursor-pointer rounded-full border border-border/60 bg-background/95 text-sm font-medium text-muted-foreground shadow-sm transition hover:border-border hover:bg-muted/60 hover:text-foreground dark:border-border/40 dark:bg-slate-950/60"
          />
        </div>
      </div>

      <div className="mt-6">
        <ProductGrid
          items={initialItems}
          className="space-y-5"
          infinite={{
            hasMore: initialHasMore,
            initialPage: 2,
            loadPage,
            resetKey: `${sort}:${productKey}`,
            loadingSkeletonCount: CATEGORY_GRID_PAGE_SIZE,
          }}
          emptyState={
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20">
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                No products available for this category yet.
              </p>
            </div>
          }
        />
      </div>
    </section>
  )
}
