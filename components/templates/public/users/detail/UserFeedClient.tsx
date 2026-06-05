"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowUp, ExternalLink, ImageIcon } from "lucide-react"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { getUserProductsPage } from "@/actions/public/users/actions"
import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

interface UserFeedClientProps {
  userId: string
  initialItems: HomepageFeedItem[]
  initialPage: number
  pageSize: number
  referenceDateIso: string
  initialHasMore: boolean
}

function ProductImage({ item }: { item: HomepageFeedItem }) {
  if (!item.logo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#e5eeff] text-[#74777d]">
        <ImageIcon className="h-10 w-10" aria-hidden />
      </div>
    )
  }

  return (
    <Image
      src={item.logo}
      alt={`${item.name} product image`}
      fill
      sizes="(min-width: 1024px) 760px, 100vw"
      className="object-cover transition duration-500 group-hover:scale-105"
    />
  )
}

function ProductCard({ item }: { item: HomepageFeedItem }) {
  const href = productPath(item.slug)
  const tags = [item.category, item.pricingModel]
    .filter(Boolean)
    .map((tag) =>
      String(tag)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .slice(0, 2)

  return (
    <article className="group overflow-hidden rounded-lg border border-[#e2e8f0] bg-white transition hover:shadow-xl">
      <Link
        href={href}
        className="relative block h-48 overflow-hidden bg-[#e5eeff]"
      >
        <ProductImage item={item} />
        {(item.isSponsored || item.badges.length > 0) && (
          <span className="absolute right-4 top-4 rounded bg-[#f97316] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-lg">
            {item.isSponsored ? "Sponsored" : "Featured Launch"}
          </span>
        )}
      </Link>
      <div className="p-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <Link
            href={href}
            className="min-w-0 text-2xl font-semibold tracking-tight text-black transition group-hover:text-[#0051d5]"
          >
            {item.name}
          </Link>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eff6ff] px-3 py-1 text-sm font-bold text-[#0051d5]">
            <ArrowUp className="h-4 w-4" aria-hidden />
            <span>{item.upvoteCount.toLocaleString("en-US")}</span>
          </div>
        </div>
        <p className="mb-5 text-base leading-7 text-[#43474c]">
          {item.tagline}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {tags.length ? (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#43474c]"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#43474c]">
                Product
              </span>
            )}
          </div>
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0051d5] hover:underline"
          >
            View Project
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function UserFeedClient({
  userId,
  initialItems,
  initialPage,
  pageSize,
  initialHasMore,
}: UserFeedClientProps) {
  const normalizedInitialPage =
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 2
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 20

  const [items, setItems] = useState<HomepageFeedItem[]>(initialItems)
  const [page, setPage] = useState<number>(normalizedInitialPage)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const resetKey = useMemo(
    () =>
      [
        userId,
        normalizedPageSize,
        normalizedInitialPage,
        initialItems.map((item) => item.id).join("|"),
      ].join(":"),
    [initialItems, normalizedInitialPage, normalizedPageSize, userId],
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
      const result = await getUserProductsPage({
        userId,
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
  }, [hasMore, isLoading, normalizedPageSize, page, userId])

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
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c]">
        No published products yet. Check back soon.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-4", items.length > 1 && "md:grid-cols-2")}>
        {items.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-sm text-[#43474c]"
        >
          {isLoading ? "Loading more launches..." : "Keep scrolling for more"}
        </div>
      ) : null}
    </div>
  )
}

export default UserFeedClient
