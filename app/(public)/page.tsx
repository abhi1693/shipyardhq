import LandingHero from "@/components/organisms/LandingHero"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import {
  getProducts,
  getTopCategories,
  getTrendingProducts,
  getHomepageFeatureProducts,
} from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { Leaderboard } from "@/components/organisms/Leaderboard"
import { TopCategories } from "@/components/organisms/TopCategories"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import JoinCrewCTA from "@/components/organisms/JoinCrewCTA"
import FeaturedOnSection from "@/components/organisms/FeaturedOnSection"
import InteractiveTrendRadar from "@/components/organisms/InteractiveTrendRadar"
import { InsightsShowcase } from "@/components/organisms/insights/InsightsShowcase"
import { computeTrendRadarMetrics } from "@/lib/trend-radar"
import { siteConfig } from "@/lib/siteConfig"
import { BROWSE_PATH } from "@/lib/routes"

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
    homepagePromo,
    stats,
  ] = await Promise.all([
    getProducts("featured"),
    getProducts("editor-pick"),
    getProducts("new"),
    getTrendingProducts(6),
    getTopCategories(),
    getHomepageFeatureProducts(6),
    getLeaderboardStats(),
  ])

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
      <main className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,252,0.92)40%,rgba(233,243,251,0.9))] dark:bg-[linear-gradient(180deg,rgba(6,18,36,0.92),rgba(4,24,43,0.92)40%,rgba(9,32,55,0.92))]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_0%_0%,var(--brand-2)/0.12,transparent_65%),radial-gradient(120%_120%_at_100%_10%,var(--brand-3)/0.14,transparent_72%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
            backgroundSize: "160px 160px",
            maskImage:
              "radial-gradient(80% 110% at 50% 10%, rgba(0, 0, 0, 0.9), transparent 70%)",
          }}
        />

        <LandingHero
          stats={{
            totalProducts: stats.totalProducts,
            totalCreators: stats.totalCreators,
            totalUpvotes: stats.totalUpvotes,
            totalInsights: stats.totalInsights,
          }}
        />
        <FeaturedHighlights products={featuredProducts} />
        <HomepageSpotlight products={homepagePromo} />
        <EditorsPick products={editorsPick} />
        <LatestLaunches products={latestLaunches} />
        <Leaderboard products={trendingProducts.slice(0, 3)} />
        <InteractiveTrendRadar
          categories={radarData.metrics}
          totals={radarData.totals}
        />
        <InsightsShowcase
          eyebrow="New: Shipyard Insights"
          title="Insights turns launch signal into strategy"
          description="Run the pipeline to combine analytics, competitive research, and community sentiment into an action plan—free plans include one run each week when you publish."
        />
        <TopCategories categories={topCategories} />
        <JoinCrewCTA />
        <FeaturedOnSection />
      </main>
    </>
  )
}
