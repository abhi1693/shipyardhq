"use client"

import { useMemo, useState } from "react"
import ProductList from "@/components/molecules/ProductList"
import InlineSelect from "@/components/molecules/InlineSelect"

type ProductForCard = {
  id: string
  name: string
  logo: string
  tagline: string
  createdAt: string | Date
  analytics?: { views: number; upvotes: number; clicks: number } | null
  user?: { firstName: string | null; lastName: string | null } | null
  category?: { name: string } | null
}

type Props = {
  products: ProductForCard[]
}

type SortKey = "newest" | "upvotes" | "views" | "clicks" | "name"

export function CategoryProductsClient({ products }: Props) {
  const [sort, setSort] = useState<SortKey>("newest")

  const sorted = useMemo(() => {
    const items = [...products]
    switch (sort) {
      case "name":
        return items.sort((a, b) => a.name.localeCompare(b.name))
      case "upvotes":
        return items.sort(
          (a, b) => (b.analytics?.upvotes || 0) - (a.analytics?.upvotes || 0),
        )
      case "views":
        return items.sort(
          (a, b) => (b.analytics?.views || 0) - (a.analytics?.views || 0),
        )
      case "clicks":
        return items.sort(
          (a, b) => (b.analytics?.clicks || 0) - (a.analytics?.clicks || 0),
        )
      case "newest":
      default:
        return items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
    }
  }, [products, sort])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Products</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <InlineSelect
            value={sort}
            onValueChange={(v) => setSort(v as SortKey)}
            placeholder="Select sort"
            options={[
              { value: "newest", label: "Newest" },
              { value: "upvotes", label: "Most Upvoted" },
              { value: "views", label: "Most Viewed" },
              { value: "clicks", label: "Most Clicked" },
              { value: "name", label: "Name (A–Z)" },
            ]}
            triggerClassName="h-8 w-[160px]"
          />
        </div>
      </div>

      <ProductList
        items={sorted}
        compact
        showCategory
        showVerified={false}
      />
    </div>
  )
}
