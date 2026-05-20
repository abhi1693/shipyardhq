"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import MakerFeedCard from "@/components/molecules/MakerFeedCard"
import type { PublicUsersPageResult } from "@/actions/public/users/actions"
import { getPublicUsersPage } from "@/actions/public/users/actions"

type MakerListItem = PublicUsersPageResult["items"][number]

interface MakersFeedClientProps {
  initialItems: MakerListItem[]
  initialPage: number
  pageSize: number
  initialHasMore: boolean
}

const mapMakerMeta = (maker: MakerListItem) => {
  const first = maker.firstName?.trim() ?? ""
  const last = maker.lastName?.trim() ?? ""
  const name = `${first} ${last}`.trim() || "Shipyard maker"
  const initialsSource = name.split(/\s+/).slice(0, 2)
  const initials =
    initialsSource
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "SY"
  const launches = maker._count.products

  return { name, initials, launches }
}

export function MakersFeedClient({
  initialItems,
  initialPage,
  pageSize,
  initialHasMore,
}: MakersFeedClientProps) {
  const normalizedInitialPage =
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 2
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 20

  const [items, setItems] = useState<MakerListItem[]>(initialItems)
  const [page, setPage] = useState<number>(normalizedInitialPage)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        normalizedPageSize,
        normalizedInitialPage,
        initialItems.map((item) => item.id).join("|"),
      ].join(":"),
    [initialItems, normalizedInitialPage, normalizedPageSize],
  )

  useEffect(() => {
    setItems(initialItems)
    setPage(normalizedInitialPage)
    setHasMore(initialHasMore)
  }, [initialHasMore, initialItems, normalizedInitialPage, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    setIsLoading(true)
    try {
      const result = await getPublicUsersPage({
        page,
        pageSize: normalizedPageSize,
      })

      setItems((previous) => {
        const existingIds = new Set(previous.map((item) => item.id))
        const nextItems = result.items.filter(
          (item) => !existingIds.has(item.id),
        )

        if (!nextItems.length) return previous
        return [...previous, ...nextItems]
      })

      setHasMore(result.hasMore)
      setPage((current) => {
        if (result.nextPage) return result.nextPage
        if (result.hasMore) return current + 1
        return current
      })
    } catch {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, normalizedPageSize, page])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (isVisible) {
          loadMore()
        }
      },
      { rootMargin: "0px 0px 320px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, resetKey])

  if (!items.length && !hasMore) {
    return (
      <section className="rounded-3xl border border-border/70 bg-background/90 p-6 text-center text-sm text-muted-foreground shadow-sm shadow-black/5">
        No makers to show yet. Check back soon.
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((maker) => {
          const { name, initials, launches } = mapMakerMeta(maker)
          return (
            <MakerFeedCard
              key={maker.id}
              item={{
                id: maker.id,
                name,
                initials,
                launches,
                avatarUrl: maker.avatarUrl,
              }}
            />
          )
        })}
      </div>

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-muted-foreground"
        >
          {isLoading ? "Loading more makers…" : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

export default MakersFeedClient
