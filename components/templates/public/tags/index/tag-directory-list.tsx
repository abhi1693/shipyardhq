"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import Link from "next/link"

import { getTagDirectoryPage } from "@/actions/public/tags/directory-page"
import type { KeywordTagSummary } from "@/actions/public/tags/actions"
import { formatTagLabel } from "@/app/(public)/tags/_utils"
import { Skeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

interface TagDirectoryListProps {
  initialItems: KeywordTagSummary[]
  initialHasMore: boolean
  pageSize: number
  totalTags: number
}

const SENTINEL_ROOT_MARGIN = "0px 0px 240px 0px"
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
})

function formatUpdatedLabel(date: Date | string | null | undefined) {
  if (!date) return null
  try {
    const parsed = typeof date === "string" ? new Date(date) : date
    if (Number.isNaN(parsed.getTime())) {
      return null
    }
    const diff = Date.now() - parsed.getTime()
    const minutes = Math.round(diff / 60000)
    if (minutes < 60) {
      return RELATIVE_TIME_FORMATTER.format(-minutes, "minute")
    }
    const hours = Math.round(minutes / 60)
    if (hours < 24) {
      return RELATIVE_TIME_FORMATTER.format(-hours, "hour")
    }
    const days = Math.round(hours / 24)
    if (days < 30) {
      return RELATIVE_TIME_FORMATTER.format(-days, "day")
    }
    const months = Math.round(days / 30)
    if (months < 12) {
      return RELATIVE_TIME_FORMATTER.format(-months, "month")
    }
    const years = Math.round(months / 12)
    return RELATIVE_TIME_FORMATTER.format(-years, "year")
  } catch {
    return null
  }
}

function TagDirectoryCard({ summary }: { summary: KeywordTagSummary }) {
  const label = useMemo(
    () => formatTagLabel(summary.canonical || summary.keyword),
    [summary.canonical, summary.keyword],
  )
  const updatedLabel = useMemo(
    () => formatUpdatedLabel(summary.lastUpdated),
    [summary.lastUpdated],
  )
  const productCount = Number(summary.productCount ?? 0)
  const productCountLabel = useMemo(
    () => new Intl.NumberFormat().format(productCount),
    [productCount],
  )
  const productCountWord = productCount === 1 ? "product" : "products"

  return (
    <Link
      href={`/tags/${summary.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)] focus-visible:ring-offset-2"
    >
      <article
        className={cn(
          "flex h-full flex-col rounded-2xl border border-border/60 bg-white/95 px-5 py-5 shadow-sm transition-transform duration-200 ease-out",
          "hover:-translate-y-1 hover:shadow-lg",
        )}
      >
        <div className="flex w-full items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground">
            {label}
          </h3>
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
          <span className="text-xs font-semibold tracking-tight text-foreground">
            {productCountLabel} {productCountWord}
          </span>
          <span className="text-xs text-muted-foreground">
            {updatedLabel ? `Updated ${updatedLabel}` : "Fresh launches weekly"}
          </span>
        </div>
      </article>
    </Link>
  )
}

function TagDirectoryListSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`tag-directory-skeleton-${index}`}
          className="flex h-full flex-col rounded-2xl border border-border/60 bg-white/95 px-5 py-5 shadow-sm"
        >
          <Skeleton className="h-6 w-3/4 rounded-full" />
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TagDirectoryList({
  initialItems,
  initialHasMore,
  pageSize,
  totalTags,
}: TagDirectoryListProps) {
  const [items, setItems] = useState(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(2)
  const [isPending, startTransition] = useTransition()
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(() => {
    if (!hasMore || isPending) return

    startTransition(async () => {
      try {
        const nextPage = page
        const result = await getTagDirectoryPage({
          page: nextPage,
          pageSize,
        })

        if (result.items.length) {
          setItems((prev) => [...prev, ...result.items])
        }

        setHasMore(result.hasMore)
        setPage((prev) => prev + 1)
      } catch {
        setHasMore(false)
      }
    })
  }, [hasMore, isPending, page, pageSize])

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
      { rootMargin: SENTINEL_ROOT_MARGIN },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore])

  if (!items.length) {
    return (
      <p className="rounded-3xl border border-dashed border-border/40 bg-white/70 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
        Once products add keywords, you’ll see every tag listed here.
      </p>
    )
  }

  return (
    <section className="space-y-6" data-testid="tag-directory-list">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((summary) => (
          <li key={summary.slug} className="h-full">
            <TagDirectoryCard summary={summary} />
          </li>
        ))}
      </ul>

      {isPending ? (
        <TagDirectoryListSkeleton count={Math.min(pageSize, 6)} />
      ) : null}

      {hasMore ? (
        <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
      ) : (
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
          Showing {items.length.toLocaleString()} of{" "}
          {totalTags.toLocaleString()} tags
        </p>
      )}
    </section>
  )
}

export default TagDirectoryList
