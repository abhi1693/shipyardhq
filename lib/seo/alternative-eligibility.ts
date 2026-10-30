import { isReviewedLaunchComparison } from "@/lib/launch-channels/catalog"
import { isInventoryIndexable, NOINDEX_FOLLOW_ROBOTS } from "@/lib/seo/indexing"

export function isAlternativeIndexable(
  slug: string,
  publishedProductCount: number,
) {
  return (
    isReviewedLaunchComparison(slug) ||
    isInventoryIndexable(publishedProductCount)
  )
}

export function robotsForAlternative(
  slug: string,
  publishedProductCount: number,
) {
  return isAlternativeIndexable(slug, publishedProductCount)
    ? undefined
    : NOINDEX_FOLLOW_ROBOTS
}

export function alternativeCollectionTitle(
  name: string,
  publishedProductCount: number,
) {
  return publishedProductCount > 0
    ? `${publishedProductCount} listed ${name} alternatives`
    : `${name} alternatives`
}
