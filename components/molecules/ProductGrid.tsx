"use client"

import {
  Category,
  Product,
  ProductAnalytics,
  ProductVerification,
  User,
} from "@prisma/client"
import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/atoms/button"
import ProductList from "@/components/molecules/ProductList"
import { buildQuery } from "@/lib/urlParams"

type ProductWithMeta = Product & {
  category: Category
  user: User
  analytics: ProductAnalytics | null
  verification: ProductVerification | null
  ProductBadge?: { badge: string; expiresAt?: Date | string | null }[]
}

interface ProductGridProps {
  initialProducts: ProductWithMeta[]
  initialHasMore: boolean
  searchParams: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
  }
}

export default function ProductGrid({
  initialProducts,
  initialHasMore,
  searchParams,
}: ProductGridProps) {
  const [products, setProducts] = useState<ProductWithMeta[]>(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(2)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    setLoading(true)

    const url = buildQuery("/api/browse", "", {
      page: String(page),
      useCase: searchParams.useCase,
      category: searchParams.category,
      sort: searchParams.sort,
      verified: searchParams.verified ? "true" : undefined,
    })

    const res = await fetch(url)
    const json = await res.json()

    setProducts((prev) => [...prev, ...json.products])
    setHasMore(json.hasMore)
    setPage((prev) => prev + 1)
    setLoading(false)
  }

  return (
    <section className="space-y-10">
      <ProductList
        items={products.map((p) => ({
          ...p,
          badges: p.ProductBadge?.filter(
            (pb) => !pb.expiresAt || new Date(pb.expiresAt) > new Date(),
          ).map((pb) => pb.badge),
        }))}
        compact
        showCategory
        showVerified
        columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        topRight={(p) => (
          <div className="flex items-center gap-1">
            {p.verification?.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
        )}
      />

      {hasMore && (
        <div className="text-center pt-6">
          <Button onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </section>
  )
}
