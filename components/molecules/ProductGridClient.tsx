"use client"

import { useEffect, useState, useTransition, useRef } from "react"
import { Button } from "@/components/atoms/button"
import { Skeleton } from "@/components/atoms/skeleton"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"

import { loadMoreProducts } from "@/actions/public/browse/loadMore"
import type { CompactProductItem } from "@/components/molecules/ProductCompactGrid"

type ProductGridItem = CompactProductItem

interface ProductGridClientProps {
  initialProducts: ProductGridItem[]
  initialHasMore: boolean
  initialPage: number
  searchParams: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
    q?: string
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
  const prefetchedRef = useRef<null | {
    products: ProductGridItem[]
    hasMore: boolean
  }>(null)

  // Reset state when server-provided props change (filters/sort updated)
  useEffect(() => {
    setProducts(initialProducts)
    setHasMore(initialHasMore)
    setPage(initialPage)
  }, [initialProducts, initialHasMore, initialPage])

  const loadMore = () => {
    startTransition(async () => {
      if (prefetchedRef.current) {
        const result = prefetchedRef.current
        prefetchedRef.current = null
        setProducts((prev) => [...prev, ...result.products])
        setHasMore(result.hasMore)
        setPage((prev) => prev + 1)
      } else {
        const result = await loadMoreProducts({
          ...searchParams,
          page,
        })
        setProducts((prev) => [...prev, ...result.products])
        setHasMore(result.hasMore)
        setPage((prev) => prev + 1)
      }
    })
  }

  // Prefetch next page on mount and when search params change
  useEffect(() => {
    prefetchedRef.current = null
    ;(async () => {
      try {
        const result = await loadMoreProducts({ ...searchParams, page })
        prefetchedRef.current = result
      } catch {}
    })()
  }, [page, searchParams])

  return (
    <section className="space-y-6">
      <ProductCompactGrid
        items={products}
        columns="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      />

      {isPending && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="rounded-lg border border-[color:var(--brand-1)/0.15] bg-card/60 p-4"
              data-testid="product-card-skeleton"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      )}

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
