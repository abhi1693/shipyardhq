"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
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
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset state when server-provided props change (filters/sort updated)
  useEffect(() => {
    setProducts(initialProducts)
    setHasMore(initialHasMore)
    setPage(initialPage)
  }, [initialProducts, initialHasMore, initialPage])

  const loadMore = useCallback(() => {
    if (isPending || !hasMore) return

    startTransition(async () => {
      if (prefetchedRef.current) {
        const result = prefetchedRef.current
        prefetchedRef.current = null
        if (result.products.length) {
          setProducts((prev) => [...prev, ...result.products])
        }
        setHasMore(result.hasMore)
        setPage((prev) => prev + 1)
      } else {
        const result = await loadMoreProducts({
          ...searchParams,
          page,
        })
        if (result.products.length) {
          setProducts((prev) => [...prev, ...result.products])
        }
        setHasMore(result.hasMore)
        setPage((prev) => prev + 1)
      }
    })
  }, [hasMore, isPending, page, searchParams, startTransition])

  // Prefetch next page on mount and when search params change
  useEffect(() => {
    if (!hasMore) {
      prefetchedRef.current = null
      return
    }

    prefetchedRef.current = null
    let cancelled = false

    ;(async () => {
      try {
        const result = await loadMoreProducts({ ...searchParams, page })
        if (!cancelled) {
          prefetchedRef.current = result
        }
      } catch {
        if (!cancelled) {
          prefetchedRef.current = null
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page, searchParams, hasMore])

  useEffect(() => {
    if (!hasMore) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting)
        if (isIntersecting) {
          loadMore()
        }
      },
      {
        rootMargin: "400px 0px 200px 0px",
      },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore])

  return (
    <section className="space-y-6">
      <ProductCompactGrid items={products} />

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

      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-1 w-full"
          data-testid="browse-infinite-scroll-trigger"
        />
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end of the directory.
        </p>
      )}
    </section>
  )
}
