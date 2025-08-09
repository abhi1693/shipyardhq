import CTAFeatureYourProductCard from "@/components/molecules/CTAFeatureYourProductCard"
import { FeaturedProduct } from "@/types"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import PublicContainer from "@/components/layout/PublicContainer"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"

export function FeaturedHighlights({
  products,
}: {
  products: FeaturedProduct[]
}) {
  return (
    <PublicContainer as="section" max="marketing" paddingY="py-16" className="border-b" innerClassName="space-y-8" fillScreen={false}>
      <PageSectionHeader
        title="Featured Highlights"
        subtitle="Curated products making waves right now."
        action={
          <a
            href="/browse"
            className="hidden md:inline-flex items-center rounded-md border px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            View all
          </a>
        }
      />

      <FeaturedProductGrid
        items={products}
        filterExpiredBadges={false}
        extra={<CTAFeatureYourProductCard />}
      />
    </PublicContainer>
  )
}
