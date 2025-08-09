"use client"

import { useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { ProductCard } from "@/components/molecules/ProductCard"

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
          <Select onValueChange={(v) => setSort(v as SortKey)} value={sort}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="Select sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="upvotes">Most Upvoted</SelectItem>
              <SelectItem value="views">Most Viewed</SelectItem>
              <SelectItem value="clicks">Most Clicked</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sorted.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              name: product.name,
              logo: product.logo,
              tagline: product.tagline,
            }}
            upvotes={product.analytics?.upvotes || 0}
            author={
              product.user
                ? {
                    name: `${product.user.firstName ?? ""} ${
                      product.user.lastName ?? ""
                    }`.trim(),
                    initial: (product.user.firstName?.[0] || "").toUpperCase(),
                  }
                : undefined
            }
            category={product.category?.name || undefined}
            compact
          />
        ))}
      </div>
    </div>
  )
}
