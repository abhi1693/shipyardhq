import { getHomepageFeedViewAll } from "@/actions/public/homepage/feed"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import type { HomepageFeedView } from "@/lib/homepage/feed-views"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import ProductFeedList from "@/components/organisms/feed/ProductFeedList"
import { StickyBanner } from "@/components/organisms/StickyBanner"

interface HomepageFeedSectionProps {
  view: HomepageFeedView
}

export async function HomepageFeedSection({ view }: HomepageFeedSectionProps) {
  const items = await getHomepageFeedViewAll({
    pageSize: HOMEPAGE_FEED_PAGE_SIZE,
    view,
  })

  return (
    <section className="space-y-6" data-testid="homepage-feed-section">
      <StickyBanner />
      <ProductFeedList activeFilter={view} items={items} />
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
