"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { Button } from "@/components/atoms/button"
import { ProductChangelog } from "@/components/organisms/ProductChangelog"
import type { ProductUpdatePublicView } from "@/types/product-updates"
import { cn } from "@/lib/utils"

export function ProductUpdatesArchive({
  productName,
  initialUpdates,
  initialHasMore,
  loadMoreAction,
}: {
  productName: string
  initialUpdates: ProductUpdatePublicView[]
  initialHasMore: boolean
  loadMoreAction: (page: number) => Promise<{
    updates: ProductUpdatePublicView[]
    hasMore: boolean
  }>
}) {
  const [updates, setUpdates] =
    useState<ProductUpdatePublicView[]>(initialUpdates)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const loaderRef = useRef<HTMLDivElement | null>(null)

  const fetchNextPage = useCallback(async () => {
    if (!hasMore || loading || isPending) return
    setLoading(true)
    startTransition(async () => {
      try {
        const result = await loadMoreAction(page)
        const nextUpdates = Array.isArray(result?.updates)
          ? (result.updates as ProductUpdatePublicView[])
          : []
        if (nextUpdates.length) {
          setUpdates((prev) => [...prev, ...nextUpdates])
        }
        const nextHasMore = Boolean(result?.hasMore)
        setHasMore(nextHasMore)
        if (nextHasMore) {
          setPage((prev) => prev + 1)
        }
      } catch (error) {
        console.error("product updates: load more failed", error)
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    })
  }, [hasMore, isPending, loadMoreAction, loading, page])

  useEffect(() => {
    if (!hasMore) return
    const node = loaderRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          fetchNextPage()
        }
      },
      { rootMargin: "200px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [fetchNextPage, hasMore])

  if (!updates.length) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          No updates yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          When the team publishes changelog entries for this product, they’ll
          appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ProductChangelog productName={productName} updates={updates} />

      <div className="flex flex-col items-center gap-3">
        {hasMore ? (
          <>
            <div ref={loaderRef} className="h-1 w-full" aria-hidden />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "px-4",
                (loading || isPending) && "pointer-events-none opacity-60",
              )}
              onClick={fetchNextPage}
              disabled={loading || isPending}
            >
              {loading || isPending ? "Loading…" : "Load more updates"}
            </Button>
            <p className="text-xs text-muted-foreground">
              New updates load automatically as you scroll.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            You’re all caught up. No more updates for now.
          </p>
        )}
      </div>
    </div>
  )
}
