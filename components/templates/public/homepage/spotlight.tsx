import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import HomepageSpotlightSkeletonSection from "@/components/organisms/HomepageSpotlight.skeleton"
import { getHomepageFeatureProducts } from "@/actions/public/products/featured"

export async function HomepageSpotlightSection() {
  const placements = await getHomepageFeatureProducts(12)
  return <HomepageSpotlight placements={placements} />
}

export function HomepageSpotlightSkeleton() {
  return <HomepageSpotlightSkeletonSection />
}
