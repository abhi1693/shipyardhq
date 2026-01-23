"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"

import type { AlternativeCatalogItem } from "@/actions/public/alternatives/actions"
import { loadMoreAlternatives } from "@/actions/public/alternatives/loadMore"
import { AlternativeCatalogCard } from "@/components/molecules/AlternativeCatalogCard"
import { cn } from "@/lib/utils"

interface AlternativeCatalogGridClientProps {
  initialItems: AlternativeCatalogItem[]
  initialHasMore: boolean
  initialPage?: number
  query?: string
  pageSize?: number
  emptyState?: ReactNode
  gridClassName?: string
}

export function AlternativeCatalogGridClient({
  initialItems,
  initialHasMore,
  initialPage = 2,
  query,
  pageSize,
  emptyState = (
    <p className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
      No alternatives match your filters yet. Try a different search term.
    </p>
  ),
  gridClassName,
}: AlternativeCatalogGridClientProps) {
  const [items, setItems] = useState<AlternativeCatalogItem[]>(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextPage, setNextPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setItems(initialItems)
    setHasMore(initialHasMore)
    setNextPage(initialPage)
  }, [initialHasMore, initialItems, initialPage, query, pageSize])

  const loadMore = useCallback(() => {
    if (!hasMore || isPending) return

    startTransition(async () => {
      try {
        const result = await loadMoreAlternatives({
          page: nextPage,
          query,
          pageSize,
        })

        if (result.items.length) {
          setItems((prev) => [...prev, ...result.items])
        }

        setHasMore(result.hasMore)
        setNextPage((prev) => prev + 1)
      } catch (error) {
        console.error("Failed to load more alternatives", error)
        setHasMore(false)
      }
    })
  }, [hasMore, isPending, nextPage, pageSize, query])

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
      { rootMargin: "0px 0px 220px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore])

  if (!items.length) {
    return <div>{emptyState}</div>
  }

  return (
    <div className="space-y-8">
      <div
        className={cn(
          "grid gap-6 sm:grid-cols-2 xl:grid-cols-3",
          gridClassName,
        )}
      >
        {items.map((alternative) => (
          <AlternativeCatalogCard
            key={alternative.id}
            alternative={alternative}
          />
        ))}
      </div>

      <div className="flex justify-center">
        {isPending ? (
          <p className="text-sm font-medium text-muted-foreground">
            Loading more alternatives&hellip;
          </p>
        ) : hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full border border-border bg-white px-4 py-1.5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:text-primary"
          >
            Load more
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            You&apos;ve reached the end of the catalog.
          </p>
        )}
      </div>

      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
    </div>
  )
}
