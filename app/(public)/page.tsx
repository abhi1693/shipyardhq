import { Suspense } from "react"

import { HomepageJsonLd } from "@/components/templates/public/homepage/json-ld"
import {
  DirectoryHeaderSection,
  DirectoryHeaderSkeleton,
} from "@/components/templates/public/homepage/directory-header"
import {
  HomepageSpotlightSection,
  HomepageSpotlightSkeleton,
} from "@/components/templates/public/homepage/spotlight"
import {
  FeaturedHighlightsSection,
  FeaturedHighlightsSkeleton,
} from "@/components/templates/public/homepage/featured-highlights"
import {
  VersusTeaserSection,
  VersusTeaserSkeleton,
} from "@/components/templates/public/homepage/versus"
import {
  EditorsPickSection,
  EditorsPickSkeleton,
} from "@/components/templates/public/homepage/editors-pick"
import {
  LatestLaunchesSection,
  LatestLaunchesSkeleton,
} from "@/components/templates/public/homepage/latest-launches"
import {
  LeaderboardSection,
  LeaderboardSkeleton,
} from "@/components/templates/public/homepage/leaderboard"
import {
  RewardsLeaderboardSection,
  RewardsLeaderboardSkeleton,
} from "@/components/templates/public/homepage/rewards"
import {
  CategoryRailSection,
  CategoryRailSkeleton,
} from "@/components/templates/public/homepage/category-rail"
import {
  RadarDigestSection,
  RadarDigestSkeleton,
} from "@/components/templates/public/homepage/radar-digest"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import {
  LaunchSpotlightPromo,
  InsightsPromo,
} from "@/components/templates/public/homepage/promos"
import { DirectoryHowItWorks } from "@/components/organisms/directory/DirectoryHowItWorks"

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main className="relative isolate bg-white">
      <HomepageJsonLd />
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <Suspense fallback={<DirectoryHeaderSkeleton />}>
          <DirectoryHeaderSection />
        </Suspense>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-10">
            <Suspense fallback={<HomepageSpotlightSkeleton />}>
              <HomepageSpotlightSection />
            </Suspense>
            <Suspense fallback={<FeaturedHighlightsSkeleton />}>
              <FeaturedHighlightsSection />
            </Suspense>
            <Suspense fallback={<VersusTeaserSkeleton />}>
              <VersusTeaserSection />
            </Suspense>
            <Suspense fallback={<EditorsPickSkeleton />}>
              <EditorsPickSection />
            </Suspense>
            <Suspense fallback={<LatestLaunchesSkeleton />}>
              <LatestLaunchesSection />
            </Suspense>
            <Suspense fallback={<LeaderboardSkeleton />}>
              <LeaderboardSection />
            </Suspense>
            <Suspense fallback={<RewardsLeaderboardSkeleton />}>
              <RewardsLeaderboardSection />
            </Suspense>
          </div>

          <aside className="flex flex-col gap-8">
            <Suspense fallback={<CategoryRailSkeleton />}>
              <CategoryRailSection />
            </Suspense>
            <Suspense fallback={<RadarDigestSkeleton />}>
              <RadarDigestSection />
            </Suspense>
            <LaunchSpotlightPromo />
            <InsightsPromo />
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </aside>
        </div>

        <div className="mt-12">
          <DirectoryHowItWorks />
        </div>
      </div>
    </main>
  )
}
