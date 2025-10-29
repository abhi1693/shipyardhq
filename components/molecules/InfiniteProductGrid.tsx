"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import { ProductCard } from "@/components/molecules/ProductCard"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"

type LoadResult<T> = {
  items: T[]
  hasMore: boolean
}

type LoadPageHandler<T> = (page: number) => Promise<LoadResult<T>>

interface InfiniteProductGridProps<T extends ProductCardItem> {
  initialItems: T[]
  initialHasMore: boolean
  loadPage: LoadPageHandler<T>
  /**
   * The page index (1-based) that should be fetched the next time load-more runs.
   * Defaults to 2 assuming the first page is already provided via `initialItems`.
   */
  initialPage?: number
  loadingSkeletonCount?: number
  renderItems?: (items: T[]) => ReactNode
  renderLoadingSkeleton?: (count: number) => ReactNode
  endMessage?: ReactNode
  emptyState?: ReactNode
  /**
   * Allows forcing a reset whenever the upstream filters or query changes.
   * Changing this value will reset to the provided initial state.
   */
  resetKey?: string | number | boolean
  /**
   * Optional root margin passed to the IntersectionObserver.
   * Defaults to "400px 0px 200px 0px".
   */
  sentinelMargin?: string
}

const DEFAULT_SENTINEL_MARGIN = "0px 0px 200px 0px"

export function InfiniteProductGrid<T extends ProductCardItem>({
  initialItems,
  initialHasMore,
  loadPage,
  initialPage = 2,
  loadingSkeletonCount = 8,
  renderItems,
  renderLoadingSkeleton,
  endMessage = (
    <p className="py-4 text-center text-sm text-muted-foreground">
      You&apos;ve reached the end of the directory.
    </p>
  ),
  emptyState = (
    <p className="py-4 text-center text-sm text-muted-foreground">
      No products found.
    </p>
  ),
  resetKey,
  sentinelMargin = DEFAULT_SENTINEL_MARGIN,
}: InfiniteProductGridProps<T>) {
  const [items, setItems] = useState(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const prefetchedRef = useRef<{
    page: number
    result: LoadResult<T>
  } | null>(null)

  const hasItems = items.length > 0

  // Reset when upstream data changes (filters, query, etc.)
  useEffect(() => {
    setItems(initialItems)
    setHasMore(initialHasMore)
    setPage(initialPage)
    prefetchedRef.current = null
  }, [initialHasMore, initialItems, initialPage, resetKey])

  const loadMore = useCallback(() => {
    if (!hasMore || isPending) return

    startTransition(async () => {
      try {
        const prefetched =
          prefetchedRef.current && prefetchedRef.current.page === page
            ? prefetchedRef.current.result
            : null

        const result =
          prefetched ??
          (await loadPage(page).catch(() => ({
            items: [] as T[],
            hasMore: false,
          })))

        prefetchedRef.current = null

        if (result.items.length) {
          setItems((prev) => [...prev, ...result.items])
        }

        setHasMore(result.hasMore)
        setPage((prev) => prev + 1)
      } catch {
        // Swallow errors – the next scroll attempt will retry.
        prefetchedRef.current = null
        setHasMore(false)
      }
    })
  }, [hasMore, isPending, loadPage, page])

  // Prefetch the next page when the current page or filters change.
  useEffect(() => {
    if (!hasMore) {
      prefetchedRef.current = null
      return
    }

    let cancelled = false
    const targetPage = page

    prefetchedRef.current = null
    ;(async () => {
      try {
        const result = await loadPage(targetPage)
        if (!cancelled) {
          prefetchedRef.current = { page: targetPage, result }
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
  }, [hasMore, loadPage, page])

  // Attach the IntersectionObserver to trigger load-more.
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
        rootMargin: sentinelMargin,
      },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, sentinelMargin])

  return (
    <section className="space-y-6" data-testid="infinite-product-grid">
      {hasItems ? (
        renderItems ? (
          renderItems(items)
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )
      ) : (
        emptyState
      )}

      {isPending && (
        renderLoadingSkeleton ? (
          renderLoadingSkeleton(loadingSkeletonCount)
        ) : (
          <div className="space-y-4" data-testid="product-card-skeleton">
            {Array.from({ length: loadingSkeletonCount }).map((_, index) => (
              <ProductFeedCardSkeleton
                key={`infinite-product-grid-skeleton-${index}`}
              />
            ))}
          </div>
        )
      )}

      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-1 w-full"
          data-testid="browse-infinite-scroll-trigger"
        />
      ) : hasItems ? (
        endMessage
      ) : null}
    </section>
  )
}

export default InfiniteProductGrid
