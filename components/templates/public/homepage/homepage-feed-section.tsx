import { auth } from "@clerk/nextjs/server"

import { getHomepageFeedView } from "@/actions/public/homepage/feed"
import { HOMEPAGE_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import type { HomepageFeedView } from "@/lib/homepage/feed-views"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import HomepageFeedClient from "./homepage-feed-client"

interface HomepageFeedSectionProps {
  view: HomepageFeedView
}

export async function HomepageFeedSection({ view }: HomepageFeedSectionProps) {
  const { userId } = await auth()
  const initial = await getHomepageFeedView({
    page: 1,
    pageSize: HOMEPAGE_FEED_PAGE_SIZE,
    clerkUserId: userId,
    view,
  })

  return (
    <section className="space-y-6" data-testid="homepage-feed-section">
      <HomepageFeedClient
        activeFilter={view}
        initialItems={initial.items}
        initialPage={initial.page}
        initialNextPage={initial.nextPage}
        initialHasMore={initial.hasMore}
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
