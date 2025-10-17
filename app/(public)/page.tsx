import { Rocket, LineChart } from "lucide-react"

import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import {
  getProducts,
  getTopCategories,
  getTrendingProducts,
  getHomepageFeatureProducts,
} from "@/actions/public/products/featured"
import { getRewardsLeaderboardEntries } from "@/actions/public/rewards/actions"
import { getVersusMatchup } from "@/actions/public/products/versus"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { Leaderboard } from "@/components/organisms/Leaderboard"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import { VersusTeaser } from "@/components/organisms/versus/VersusTeaser"
import { RewardsLeaderboardPreview } from "@/components/organisms/RewardsLeaderboardPreview"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { computeTrendRadarMetrics } from "@/lib/trend-radar"
import { siteConfig } from "@/lib/siteConfig"
import {
  BROWSE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  RANK_IN_PUBLIC_PATH,
} from "@/lib/routes"
import { hydrateRewardsLeaderboardEntries } from "@/lib/rewards/display"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { DirectoryRadarDigest } from "@/components/organisms/directory/RadarDigest"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { DirectoryHowItWorks } from "@/components/organisms/directory/DirectoryHowItWorks"

const siteUrl = siteConfig.url.replace(/\/$/, "")
const homepageTitle = `Launch Faster, Get Discovered. Submit Your Product | ${siteConfig.name}`

const jsonLd = JSON.stringify([
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteUrl,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}${BROWSE_PATH}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: homepageTitle,
    description: siteConfig.description,
    url: siteUrl,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteUrl,
    },
    inLanguage: "en-US",
    mainEntityOfPage: siteUrl,
  },
])

export default async function HomePage() {
  const [
    featuredProducts,
    editorsPick,
    latestLaunches,
    trendingProducts,
    topCategories,
    homepagePlacements,
    stats,
    rewardsLeaderboardEntries,
    rankInPublicMatchup,
  ] = await Promise.all([
    getProducts("featured"),
    getProducts("editor-pick"),
    getProducts("new"),
    getTrendingProducts(6),
    getTopCategories(),
    getHomepageFeatureProducts(12),
    getLeaderboardStats(),
    getRewardsLeaderboardEntries(3),
    getVersusMatchup(),
  ])

  const rewardsLeaders = await hydrateRewardsLeaderboardEntries(
    rewardsLeaderboardEntries,
  )

  const radarSourceCategories = topCategories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    productCount: category._count.products,
  }))

  const radarTrending = trendingProducts.map((entry) => ({
    categoryName: entry.product.category?.name ?? null,
    upvotes: entry.product.analytics?.upvotes ?? null,
  }))

  const radarData = computeTrendRadarMetrics(
    radarSourceCategories,
    radarTrending,
    {
      totalProducts: stats.totalProducts,
    },
  )

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
              </aside>
            </div>
            <DirectoryHowItWorks />
          </div>
        </div>
      </main>
    </>
  )
}
