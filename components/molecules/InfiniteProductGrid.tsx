"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import {
  ProductCompactGrid,
  type CompactProductItem,
} from "@/components/molecules/ProductCompactGrid"
import { ProductCompactGridSkeleton } from "@/components/molecules/ProductCompactGrid.skeleton"

type LoadResult<T> = {
  items: T[]
  hasMore: boolean
}

type LoadPageHandler<T> = (page: number) => Promise<LoadResult<T>>

interface GridOverrides<T extends CompactProductItem> {
  className?: string
  columns?: string
  imagePriorityFirstN?: number
  renderMeta?: (item: T, index: number) => ReactNode
  showCategory?: boolean
  showBadges?: boolean
}

interface InfiniteProductGridProps<T extends CompactProductItem> {
  initialItems: T[]
  initialHasMore: boolean
  loadPage: LoadPageHandler<T>
  /**
   * The page index (1-based) that should be fetched the next time load-more runs.
   * Defaults to 2 assuming the first page is already provided via `initialItems`.
   */
  initialPage?: number
  gridOverrides?: GridOverrides<T>
  loadingSkeletonCount?: number
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

export function InfiniteProductGrid<T extends CompactProductItem>({
  initialItems,
  initialHasMore,
  loadPage,
  initialPage = 2,
  gridOverrides,
  loadingSkeletonCount = 8,
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

  const gridProps: GridOverrides<T> = useMemo(
    () => ({
      className: gridOverrides?.className,
      columns: gridOverrides?.columns,
      imagePriorityFirstN: gridOverrides?.imagePriorityFirstN,
      renderMeta: gridOverrides?.renderMeta,
      showCategory:
        gridOverrides?.showCategory === undefined
          ? true
          : gridOverrides.showCategory,
      showBadges:
        gridOverrides?.showBadges === undefined
          ? false
          : gridOverrides.showBadges,
    }),
    [gridOverrides],
  )

  return (
    <section className="space-y-6" data-testid="infinite-product-grid">
      {hasItems ? (
        <ProductCompactGrid items={items} {...gridProps} />
      ) : (
        emptyState
      )}

      {isPending && (
        <ProductCompactGridSkeleton
          count={loadingSkeletonCount}
          columns={gridProps.columns}
          data-testid="product-card-skeleton"
        />
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
