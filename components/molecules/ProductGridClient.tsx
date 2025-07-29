"use client"

import { useState, useTransition } from "react"
import { ProductCard } from "./ProductCard"
import { Button } from "@/components/atoms/button"
import { getBrowseProducts } from "@/actions/public/browse/actions"

import {
  Category,
  Product,
  ProductAnalytics,
  ProductVerification,
  User,
} from "@prisma/client"
import { loadMoreProducts } from "@/actions/public/browse/loadMore"

type ProductWithMeta = Product & {
  category: Category
  user: User
  analytics: ProductAnalytics | null
  verification: ProductVerification | null
}

interface ProductGridClientProps {
  initialProducts: ProductWithMeta[]
  initialHasMore: boolean
  initialPage: number
  searchParams: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
  }
}

export default function ProductGridClient({
  initialProducts,
  initialHasMore,
  initialPage,
  searchParams,
}: ProductGridClientProps) {
  const [products, setProducts] = useState(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()

  const loadMore = () => {
    startTransition(async () => {
      const result = await loadMoreProducts({
        ...searchParams,
        page,
      })

      setProducts((prev) => [...prev, ...result.products])
      setHasMore(result.hasMore)
      setPage((prev) => prev + 1)
    })
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
          <Button onClick={loadMore} disabled={isPending}>
            {isPending ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </section>
  )
}
