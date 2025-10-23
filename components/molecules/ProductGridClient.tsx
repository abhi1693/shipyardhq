"use client"

import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useTransition,
} from "react"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"
import { ProductCompactGridSkeleton } from "@/components/molecules/ProductCompactGrid.skeleton"

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
  const [products, setProducts] = useOptimistic(
    initialProducts,
    (
      prev,
      action:
        | ProductGridItem[]
        | ((prevProducts: ProductGridItem[]) => ProductGridItem[]),
    ) =>
      typeof action === "function"
        ? (action as (prevProducts: ProductGridItem[]) => ProductGridItem[])(
            prev,
          )
        : action,
  )
  const [hasMore, setHasMore] = useOptimistic(
    initialHasMore,
    (_prev, next: boolean) => next,
  )
  const [page, setPage] = useOptimistic(
    initialPage,
    (prev, action: number | ((prevPage: number) => number)) =>
      typeof action === "function"
        ? (action as (prevPage: number) => number)(prev)
        : action,
  )
  const [isPending, startTransition] = useTransition()
  const prefetchedRef = useRef<null | {
    products: ProductGridItem[]
    hasMore: boolean
  }>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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
  }, [
    hasMore,
    isPending,
    page,
    searchParams,
    setHasMore,
    setPage,
    setProducts,
    startTransition,
  ])

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

      {isPending && <ProductCompactGridSkeleton count={8} />}

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
