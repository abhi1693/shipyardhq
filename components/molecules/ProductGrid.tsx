"use client"

import {
  Category,
  Product,
  ProductAnalytics,
  ProductVerification,
  User,
} from "@prisma/client"
import { useState } from "react"
import { ProductCard } from "./ProductCard"
import { Button } from "@/components/atoms/button"

type ProductWithMeta = Product & {
  category: Category
  user: User
  analytics: ProductAnalytics | null
  verification: ProductVerification | null
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

    const params = new URLSearchParams({
      page: page.toString(),
      ...searchParams,
      verified: searchParams.verified ? "true" : "",
    })

    const res = await fetch(`/api/browse?${params.toString()}`)
    const json = await res.json()

    setProducts((prev) => [...prev, ...json.products])
    setHasMore(json.hasMore)
    setPage((prev) => prev + 1)
    setLoading(false)
  }

  return (
    <section className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} compact />
        ))}
      </div>

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
