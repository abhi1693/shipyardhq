"use client"

import { useMemo, useState } from "react"
import ProductList from "@/components/molecules/ProductList"
import InlineSelect from "@/components/molecules/InlineSelect"
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
  className?: string
}

type SortKey = "newest" | "upvotes" | "clicks" | "name"

export function CategoryProductsClient({ products, className }: Props) {
  const [sort, setSort] = useState<SortKey>("newest")

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

  return (
    <section
      className={cn(
        "rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/88 px-6 py-6 shadow-[0px_28px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Products</h2>
          <p className="text-xs text-muted-foreground">
            Sort to surface fresh launches, rising favorites, or the most clicks.
          </p>
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
            triggerClassName="h-9 w-[180px]"
          />
        </div>
      </div>

      <div className="mt-6">
        <ProductList items={sorted} compact showCategory showVerified={false} />
      </div>
    </section>
  )
}
