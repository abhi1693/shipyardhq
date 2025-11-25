import { Suspense } from "react"

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
import { TrafficSidebarStats } from "@/components/templates/public/common/TrafficSidebarStats"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  DEFAULT_HOMEPAGE_FEED_VIEW,
  normalizeHomepageFeedView,
} from "@/lib/homepage/feed-views"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import { siteConfig } from "@/lib/siteConfig"
import { HOME_PATH } from "@/lib/routes"

export const revalidate = 60

const HOMEPAGE_TITLE = "Show your revenue and get a free backlink on Shipyard"

export const metadata = buildPageMetadata({
  title: HOMEPAGE_TITLE,
  description:
    "Showcase your revenue on Shipyard, earn a free backlink, and meet builders who care about real traction.",
  canonical: HOME_PATH,
})

interface HomePageProps {
  searchParams: Promise<{ view?: string | string[] }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const feedView = normalizeHomepageFeedView(
    params?.view,
    DEFAULT_HOMEPAGE_FEED_VIEW,
  )
  return (
    <div className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix="home"
        webPage={{ path: HOME_PATH, name: siteConfig.tagline }}
        breadcrumbs={{
          items: [{ name: "Home", path: HOME_PATH }],
        }}
      />
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
            <Suspense fallback={null}>
              <TrafficSidebarStats />
            </Suspense>
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
