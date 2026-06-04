"use client"

import { useEffect, useState } from "react"

import {
  type HomepageFeedItem,
  type HomepageFeedPageResult,
} from "@/actions/public/homepage/feed"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { HomepageFeedClient } from "./homepage-feed-client"

const EMPTY_FEED_PAGE: HomepageFeedPageResult = {
  items: [] satisfies HomepageFeedItem[],
  page: 1,
  pageSize: HOMEPAGE_FEED_PAGE_SIZE,
  hasMore: false,
  nextPage: null,
}

function HomepageFeedLoading() {
  return (
    <section className="space-y-10" aria-busy="true">
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="h-6 w-40 rounded-full bg-slate-200/80 animate-pulse" />
          <span
            aria-hidden="true"
            className="block h-px w-full rounded-full bg-[#E5E8F5]"
          />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <ProductFeedCardSkeleton key={`feed-loader-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomepageFeedLoader() {
  const [feedPage, setFeedPage] = useState<HomepageFeedPageResult | null>(null)

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()

    async function loadFeed() {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: String(HOMEPAGE_FEED_PAGE_SIZE),
        })
        const response = await fetch(`/api/homepage/feed?${params}`, {
          signal: controller.signal,
          headers: {
            accept: "application/json",
          },
        })
        if (!response.ok) {
          throw new Error(`Failed to load homepage feed: ${response.status}`)
        }
        const result = (await response.json()) as HomepageFeedPageResult
        if (!canceled) {
          setFeedPage(result)
        }
      } catch {
        if (!canceled) {
          setFeedPage(EMPTY_FEED_PAGE)
        }
      }
    }

    loadFeed()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [])

  if (!feedPage) {
    return <HomepageFeedLoading />
  }

  return (
    <HomepageFeedClient
      activeFilter={DEFAULT_HOMEPAGE_FEED_VIEW}
      initialItems={feedPage.items}
      initialHasMore={feedPage.hasMore}
      initialPage={feedPage.nextPage ?? feedPage.page + 1}
      pageSize={feedPage.pageSize}
      referenceDateIso={new Date().toISOString()}
    />
  )
}
