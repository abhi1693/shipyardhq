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
    <section
      aria-labelledby="homepage-feed-heading"
      className="space-y-6"
      data-testid="homepage-feed-section"
    >
      <div className="space-y-3">
        <h2
          id="homepage-feed-heading"
          className="text-3xl font-semibold tracking-tight text-[#1C2333] sm:text-[2.5rem]"
        >
          Discover today&apos;s standout launches
        </h2>
        <p className="max-w-2xl text-base text-[#5B6175]">
          Upvote the products you love, surface indie makers to the top, and
          help launches find their first 100 true fans. Filter the feed to see
          what’s trending, brand-new, or boosted through featured placements.
        </p>
      </div>

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
    <section className="space-y-6" aria-labelledby="homepage-feed-heading">
      <div className="space-y-2">
        <div className="h-7 w-80 rounded-full bg-[#EEF0F6]" />
        <div className="h-4 w-64 rounded-full bg-[#EEF0F6]" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <ProductFeedCardSkeleton key={`feed-skeleton-${index}`} />
        ))}
      </div>
    </section>
  )
}
