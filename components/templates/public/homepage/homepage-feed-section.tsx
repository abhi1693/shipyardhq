import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { HomepageFeedLoader } from "./homepage-feed-loader"

export function HomepageFeedSection() {
  return (
    <section className="space-y-6" data-testid="homepage-feed-section">
      <HomepageFeedLoader />
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
