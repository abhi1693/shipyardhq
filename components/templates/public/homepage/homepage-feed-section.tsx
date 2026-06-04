import { getHomepageFeedPage } from "@/actions/public/homepage/feed"
import { HomepageFeedClient } from "@/components/templates/public/homepage/homepage-feed-client"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { StickyBanner } from "@/components/organisms/StickyBanner"

export async function HomepageFeedSection() {
  const feedPage = await getHomepageFeedPage({
    page: 1,
    pageSize: HOMEPAGE_FEED_PAGE_SIZE,
    view: DEFAULT_HOMEPAGE_FEED_VIEW,
  })
  const referenceDateIso = new Date().toISOString()

  return (
    <section className="space-y-6" data-testid="homepage-feed-section">
      <StickyBanner />
      <HomepageFeedClient
        activeFilter={DEFAULT_HOMEPAGE_FEED_VIEW}
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
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <ProductFeedCardSkeleton key={`feed-skeleton-${index}`} />
        ))}
      </div>
    </section>
  )
}
