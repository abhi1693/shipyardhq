import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"

interface LatestLaunchesProps {
  products: FeaturedProduct[]
}

export function LatestLaunches({ products }: LatestLaunchesProps) {
  if (!products || products.length === 0) return null

  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-16"
      className="border-b"
      innerClassName="space-y-8"
      fillScreen={false}
    >
      <PageSectionHeader
        title="Latest Launches"
        subtitle="Fresh off the launchpad. Explore what’s new."
      />

      <FeaturedProductGrid items={products} />
    </PublicContainer>
  )
}
