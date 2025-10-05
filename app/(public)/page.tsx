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
import HomepageExperience from "@/components/organisms/HomepageExperience"
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
    getHomepageFeatureProducts(12),
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
      <main className="relative isolate overflow-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-40 bg-[radial-gradient(120%_120%_at_0%_0%,var(--brand-1)/0.16,transparent_70%),radial-gradient(110%_110%_at_100%_-10%,var(--brand-3)/0.16,transparent_78%)] dark:bg-[radial-gradient(120%_120%_at_0%_0%,rgba(10,32,52,0.7),transparent_72%),radial-gradient(110%_110%_at_100%_-10%,rgba(5,24,48,0.7),transparent_80%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-30 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.4] to-transparent dark:via-[color:var(--brand-2)/0.5]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(11, 53, 94, 0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.08) 1px, transparent 1px)",
            backgroundSize: "180px 180px",
            maskImage:
              "radial-gradient(85% 120% at 50% 12%, rgba(0, 0, 0, 0.85), transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-35%] top-[28rem] -z-10 h-72 rounded-[45%] bg-[radial-gradient(80%_100%_at_50%_0%,var(--brand-2)/0.22,transparent_85%)] blur-3xl"
        />

        <LandingHero />
        <HomepageExperience
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
