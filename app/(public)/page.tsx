import { Suspense } from "react"

import {
  HomepageFeedSection,
  HomepageFeedSkeleton,
} from "@/components/templates/public/homepage/homepage-feed-section"
import {
  DirectoryHighlightsSidebar,
  DirectoryHighlightsSidebarSkeleton,
} from "@/components/templates/public/homepage/directory-highlights"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  DEFAULT_HOMEPAGE_FEED_VIEW,
  normalizeHomepageFeedView,
} from "@/lib/homepage/feed-views"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import { siteConfig } from "@/lib/siteConfig"
import { HOME_PATH } from "@/lib/routes"

export const dynamic = "force-dynamic"
export const revalidate = 60

const HOMEPAGE_TITLE = "Shipyard shows what builders are actually clicking on"

export const metadata = buildPageMetadata({
  title: HOMEPAGE_TITLE,
  description: "Ranked by real interest — not launch-day hype.",
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
        main={
          <>
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
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
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
            <Suspense fallback={<DirectoryHighlightsSidebarSkeleton />}>
              <DirectoryHighlightsSidebar />
            </Suspense>
            <div className="hidden lg:block">
              <AffiliateLinkCard />
            </div>
          </>
        }
      />
    </div>
  )
}
