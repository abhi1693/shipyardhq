import {
  cached,
  DEFAULT_TTL,
  TAGS,
  accelerateTags,
} from "@/lib/cache"
import { siteConfig } from "@/lib/siteConfig"
import { BROWSE_PATH } from "@/lib/routes"
import { computeTrendRadarMetrics } from "@/lib/trend-radar"
import { hydrateRewardsLeaderboardEntries } from "@/lib/rewards/display"
import {
  getProducts,
  getTrendingProducts,
  getTopCategories,
  getHomepageFeatureProducts,
} from "@/actions/public/products/featured"
import { getVersusMatchup } from "@/actions/public/products/versus"
import { getRewardsLeaderboardEntries } from "@/actions/public/rewards/actions"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { getLatestPublicProductUpdates } from "@/actions/public/product-updates/actions"

const siteUrl = siteConfig.url.replace(/\/$/, "")
const homepageTitle = `Launch Faster, Get Discovered. Submit Your Product | ${siteConfig.name}`

const buildHomepageJsonLd = () =>
  JSON.stringify([
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

type AwaitedReturn<T extends (...args: any[]) => Promise<any>> = Awaited<
  ReturnType<T>
>

export type HomepagePayload = {
  featuredProducts: AwaitedReturn<typeof getProducts>
  editorsPick: AwaitedReturn<typeof getProducts>
  latestLaunches: AwaitedReturn<typeof getProducts>
  trendingProducts: AwaitedReturn<typeof getTrendingProducts>
  topCategories: AwaitedReturn<typeof getTopCategories>
  homepagePlacements: AwaitedReturn<typeof getHomepageFeatureProducts>
  stats: AwaitedReturn<typeof getLeaderboardStats>
  rewardsLeaders: Awaited<
    ReturnType<typeof hydrateRewardsLeaderboardEntries>
  >
  rankInPublicMatchup: AwaitedReturn<typeof getVersusMatchup>
  latestProductUpdates: AwaitedReturn<typeof getLatestPublicProductUpdates>
  radarData: ReturnType<typeof computeTrendRadarMetrics>
  jsonLd: string
}

export const getHomepagePayload = cached(
  async (): Promise<HomepagePayload> => {
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
      latestProductUpdates,
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
      getLatestPublicProductUpdates(6),
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

    return {
      featuredProducts,
      editorsPick,
      latestLaunches,
      trendingProducts,
      topCategories,
      homepagePlacements,
      stats,
      rewardsLeaders,
      rankInPublicMatchup,
      latestProductUpdates,
      radarData,
      jsonLd: buildHomepageJsonLd(),
    }
  },
  "homepage:payload",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () =>
      accelerateTags([
        TAGS.homepage,
        TAGS.products,
        TAGS.categories,
        TAGS.rewards,
        TAGS.leaderboard,
        TAGS.productUpdatesLatest,
      ]),
  },
)
