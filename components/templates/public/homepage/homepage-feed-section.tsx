import Link from "next/link"

import { getHomepageFeedPage } from "@/actions/public/homepage/feed"
import { HomepageFeedClient } from "@/components/templates/public/homepage/homepage-feed-client"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import {
  DEFAULT_HOMEPAGE_FEED_VIEW,
  HOMEPAGE_FEED_VIEW_LABELS,
  HOMEPAGE_FEED_VIEWS,
  type HomepageFeedView,
} from "@/lib/homepage/feed-views"
import { HOME_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { StickyBanner } from "@/components/organisms/StickyBanner"

interface HomepageFeedSectionProps {
  view: HomepageFeedView
}

export async function HomepageFeedSection({ view }: HomepageFeedSectionProps) {
  const feedPage = await getHomepageFeedPage({
    page: 1,
    pageSize: HOMEPAGE_FEED_PAGE_SIZE,
    view,
  })
  const referenceDateIso = new Date().toISOString()

  const viewCopy: Record<HomepageFeedView, string> = {
    new: "Fresh launches, published most recently.",
    "most-clicked": "Most clicked products over the last 7 days.",
  }

  const viewHref = (target: HomepageFeedView) =>
    target === DEFAULT_HOMEPAGE_FEED_VIEW
      ? HOME_PATH
      : `${HOME_PATH}?view=${encodeURIComponent(target)}`

  return (
    <section className="space-y-6" data-testid="homepage-feed-section">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {HOMEPAGE_FEED_VIEWS.map((feedView) => {
            const isActive = feedView === view
            return (
              <Link
                key={feedView}
                href={viewHref(feedView)}
                scroll={false}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                  isActive
                    ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-white shadow-[0_12px_32px_-18px_rgba(4,59,89,0.35)] hover:border-[color:var(--brand-1)] hover:bg-[color:var(--brand-1)] hover:text-white"
                    : "border-border/70 bg-white text-[#1C2333] hover:border-[color:var(--brand-1)]/60 hover:bg-[color:var(--brand-1)/0.06] hover:text-[color:var(--brand-1)]",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {HOMEPAGE_FEED_VIEW_LABELS[feedView]}
              </Link>
            )
          })}
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {viewCopy[view]}
        </p>
      </div>
      <StickyBanner />
      <HomepageFeedClient
        activeFilter={view}
        initialItems={feedPage.items}
        initialHasMore={feedPage.hasMore}
        initialPage={feedPage.nextPage ?? feedPage.page + 1}
        pageSize={feedPage.pageSize}
        referenceDateIso={referenceDateIso}
      />
    </section>
  )
}

export function HomepageFeedSkeleton() {
  return (
    <section className="space-y-6">
      <div className="h-14 rounded-2xl border border-border/60 bg-white/70" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <ProductFeedCardSkeleton key={`feed-skeleton-${index}`} />
        ))}
      </div>
    </section>
  )
}
