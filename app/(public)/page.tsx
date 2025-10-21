import { Rocket, LineChart } from "lucide-react"

import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { Leaderboard } from "@/components/organisms/Leaderboard"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import { VersusTeaser } from "@/components/organisms/versus/VersusTeaser"
import { RewardsLeaderboardPreview } from "@/components/organisms/RewardsLeaderboardPreview"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { DirectoryRadarDigest } from "@/components/organisms/directory/RadarDigest"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { DirectoryHowItWorks } from "@/components/organisms/directory/DirectoryHowItWorks"
import { ProductUpdatesFeed } from "@/components/molecules/ProductUpdatesFeed"
import { getHomepagePayload } from "@/lib/homepage/cache"
import {
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  RANK_IN_PUBLIC_PATH,
} from "@/lib/routes"

export default async function HomePage() {
  const {
    jsonLd,
    stats,
    featuredProducts,
    editorsPick,
    latestLaunches,
    trendingProducts,
    topCategories,
    homepagePlacements,
    rewardsLeaders,
    rankInPublicMatchup,
    latestProductUpdates,
    radarData,
  } = await getHomepagePayload()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className="relative isolate bg-white">
        <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
          <div className="space-y-12">
            <DirectoryHeader
              stats={stats}
              secondaryAction={{
                label: "Join the live showdown",
                href: RANK_IN_PUBLIC_PATH,
              }}
            />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
              <div className="flex flex-col gap-10">
                <HomepageSpotlight placements={homepagePlacements} />
                <FeaturedHighlights products={featuredProducts} />
                <VersusTeaser matchup={rankInPublicMatchup} />
                <EditorsPick products={editorsPick} />
                <LatestLaunches products={latestLaunches} />
                <Leaderboard products={trendingProducts} />
                <RewardsLeaderboardPreview entries={rewardsLeaders} />
              </div>
              <aside className="flex flex-col gap-8">
                <DirectoryCategoryRail categories={topCategories} />
                <DirectoryRadarDigest
                  metrics={radarData.metrics}
                  totals={radarData.totals}
                />
                <DirectoryPromoCard
                  eyebrow="Launch with Shipyard"
                  title="Claim the homepage spotlight for your next drop"
                  description="Publish your launch to unlock priority across the homepage, featured lanes, and leaderboard placements that drive discovery."
                  cta={{
                    label: "Submit your launch",
                    href: MEMBER_PRODUCTS_PATH,
                    icon: <Rocket className="h-4 w-4" aria-hidden="true" />,
                  }}
                />
                <DirectoryPromoCard
                  eyebrow="Shipyard Insights"
                  title="Transform real-time signals into your next play"
                  description="Run Shipyard Insights to merge analytics, community sentiment, and competitor scans into action-ready recommendations."
                  cta={{
                    label: "Explore Insights plans",
                    href: PRICING_PATH,
                    variant: "ghost",
                    icon: <LineChart className="h-4 w-4" aria-hidden="true" />,
                  }}
                />
                <ProductUpdatesFeed updates={latestProductUpdates} />
              </aside>
            </div>
            <DirectoryHowItWorks />
          </div>
        </div>
      </main>
    </>
  )
}
