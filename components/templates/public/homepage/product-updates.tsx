import { getLatestPublicProductUpdates } from "@/actions/public/product-updates/actions"
import { ProductUpdatesFeed } from "@/components/molecules/ProductUpdatesFeed"
import { ProductUpdatesFeedSkeleton } from "@/components/molecules/ProductUpdatesFeed.skeleton"

export async function ProductUpdatesSection() {
  const updates = await getLatestPublicProductUpdates(6)
  return <ProductUpdatesFeed updates={updates} />
}

export function ProductUpdatesSkeleton() {
  return <ProductUpdatesFeedSkeleton />
}
