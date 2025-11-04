import { Suspense } from "react"

import { HomepageJsonLd } from "@/components/templates/public/homepage/json-ld"
import {
  HeroSection,
  HeroSectionSkeleton,
} from "@/components/templates/public/homepage/hero-section"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import {
  HomepageFeedSection,
  HomepageFeedSkeleton,
} from "@/components/templates/public/homepage/homepage-feed-section"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { DEFAULT_HOMEPAGE_FEED_VIEW } from "@/lib/homepage/feed-views"

export const revalidate = 60

export default async function HomePage() {
  const feedView = DEFAULT_HOMEPAGE_FEED_VIEW
  return (
    <div className="relative isolate bg-[#f5f7fb]">
      <HomepageJsonLd />
      <PublicTwoColumnLayout
        className="pb-24 pt-10"
        mainClassName="gap-12"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <Suspense fallback={<HeroSectionSkeleton />}>
              <HeroSection />
            </Suspense>
            <Suspense
              fallback={
                <div className="lg:hidden">
                  <SponsoredProductsSkeleton />
                </div>
              }
            >
              <div className="lg:hidden">
                <SponsoredProductsSection />
              </div>
            </Suspense>
            <Suspense fallback={<HomepageFeedSkeleton />}>
              <HomepageFeedSection view={feedView} />
            </Suspense>
          </>
        }
        sidebar={
          <>
            <Suspense
              fallback={
                <div className="hidden lg:block">
                  <SponsoredProductsSkeleton />
                </div>
              }
            >
              <div className="hidden lg:block">
                <SponsoredProductsSection />
              </div>
            </Suspense>
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </>
        }
      />
    </div>
  )
}
