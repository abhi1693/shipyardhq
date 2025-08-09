"use client"

import { useEffect, useState, useTransition, useRef } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/atoms/button"
import { Skeleton } from "@/components/atoms/skeleton"
import ProductList from "@/components/molecules/ProductList"

import { Category, Product, ProductAnalytics, ProductVerification, User } from "@prisma/client"
import { loadMoreProducts } from "@/actions/public/browse/loadMore"

type ProductWithMeta = Product & {
  category: Category
  user: User
  analytics: ProductAnalytics | null
  verification: ProductVerification | null
  ProductBadge?: { badge: string }[]
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
  const prefetchedRef = useRef<null | {
    products: ProductWithMeta[]
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
      <ProductList
        items={products.map((p) => ({
          ...p,
          badges: p.ProductBadge?.map((pb) => pb.badge),
        }))}
        compact
        showCategory
        showVerified={false}
        columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        topRight={(p) => (
          <div className="flex items-center gap-1">
            {p.verification?.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]">
                <Check className="h-3 w-3" /> Verified
              </span>
            )}
            {p.category?.name && (
              <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px]">
                {p.category.name}
              </span>
            )}
          </div>
        )}
      />

      {isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`sk-${i}`} className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="mt-4 h-16 w-full" />
              <div className="mt-4 flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
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
