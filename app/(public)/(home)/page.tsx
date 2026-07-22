import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  Megaphone,
  MousePointerClick,
  Rocket,
  Search,
  TrendingUp,
  Trophy,
  Wrench,
} from "lucide-react"

import {
  getHomepageFeedPage,
  getHomepageLaunchOfDay,
  type HomepageFeedItem,
} from "@/actions/public/homepage/feed"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { Button } from "@/components/atoms/button"
import {
  HomepageDropsInfiniteList,
  HomepageVoteStateProvider,
} from "@/components/templates/public/homepage/homepage-client"
import { VisitorSparkline } from "@/components/templates/public/homepage/VisitorSparkline"
import { AnswerBlocks } from "@/components/templates/public/common/AnswerBlocks"
import { PublicBuilderCountMessage } from "@/components/templates/public/common/PublicBuilderCountMessage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  GUIDES_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  TOOLS_PATH,
  guidePath,
  productPath,
} from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { siteConfig } from "@/lib/siteConfig"
import { cn } from "@/lib/utils"
import { HOMEPAGE_INITIAL_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"
import type { ProductCategorySummary } from "@/lib/products/categories"
import {
  ANALYTICS_REPORTING_WINDOW_DAYS,
  formatAnalyticsReportingWindowLabel,
} from "@/lib/analytics/reportingWindow"

const HOMEPAGE_TITLE = "Product Launch Platform and Startup Directory"
const PRICING_PLANS_PATH = `${PRICING_PATH}#plans` as const
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export const metadata = buildPageMetadata({
  title: HOMEPAGE_TITLE,
  description: `Discover new apps, SaaS products, and startup tools, or submit your product to ${BRAND_NAME}'s independent product launch directory. Get a free listing, weekly rankings, founder guides, and practical visibility insights.`,
  canonical: HOME_PATH,
})

type DisplayDrop = {
  id?: string
  slug?: string
  name: string
  tagline: string
  logo?: string | null
  category?: string | null
  categorySlug?: string | null
  categories: ProductCategorySummary[]
  score?: number | null
  scoreCount?: number | null
  rank?: number | null
  upvoteGrowthPercent?: number | null
  isSponsored?: boolean
  variant?: HomepageFeedItem["variant"]
  isVoted?: boolean
  publishedAt?: string | null
  createdAt?: string
}

const HOMEPAGE_VALUE_POINTS = [
  {
    icon: Compass,
    title: "Get discovered in context",
    body: "Appear beside active launches, useful categories, real votes, and products people are already exploring.",
  },
  {
    icon: MousePointerClick,
    title: "Learn what earns a click",
    body: "Product visits, votes, rankings, and traffic signals help you understand which positioning is landing with builders.",
  },
  {
    icon: Trophy,
    title: "Turn launch day into a run",
    body: "Daily showcases and leaderboards give strong launches a place to keep earning discovery after the first spike.",
  },
  {
    icon: BookOpen,
    title: "Use the founder playbook",
    body: "Plain-English launch guides and free tools help you prepare the page, message, and follow-up before you promote.",
  },
] as const

const HOMEPAGE_EXPLORE_LINKS = [
  {
    icon: Compass,
    label: "Discover",
    title: "Browse new products",
    body: "Fresh launches, useful categories, and independent tools.",
    href: BROWSE_PATH,
  },
  {
    icon: Rocket,
    label: "Launch",
    title: "Submit your product",
    body: "Start with a free public listing and join the live feed.",
    href: MEMBER_PRODUCTS_ADD_PATH,
    prefetch: false,
  },
  {
    icon: BookOpen,
    label: "Learn",
    title: "Follow founder guides",
    body: "Plan launch day, directory outreach, and durable discovery.",
    href: GUIDES_PATH,
  },
  {
    icon: Wrench,
    label: "Improve",
    title: "Use free launch tools",
    body: "Polish search previews, social cards, and launch assets.",
    href: TOOLS_PATH,
  },
] as const

const HOMEPAGE_ANSWER_BLOCKS = [
  {
    title: "What Shipyard is",
    body: `${BRAND_NAME} combines a live product launch directory with rankings, founder guides, free tools, and visibility insights for apps, SaaS products, APIs, and startups.`,
  },
  {
    title: "Who it is for",
    body: "Shipyard is for founders launching products, buyers discovering useful software, and builders learning how other products earn attention.",
  },
  {
    title: "How discovery works",
    body: "Launch highlights use public signals including recency, votes, product visits, ranking context, editorial picks, and clearly labelled sponsored eligibility.",
  },
  {
    title: "How fresh it is",
    body: "Launch data updates as products are published, voted on, promoted, ranked, or refreshed in the public discovery feed.",
  },
  {
    title: "Do-follow links and Domain Rating",
    body: `A standard editorial link is often called a do-follow link. Paid ${BRAND_NAME} placements use a sponsored link instead. A listing can still introduce a new site to visitors, earn brand mentions, and support authority over time, but no product directory can guarantee a Domain Rating or search ranking boost.`,
  },
] as const

const HOMEPAGE_VISIBILITY_OPTIONS = [
  {
    icon: Megaphone,
    title: "Start with a free listing",
    body: "Publish your product, join the launch feed, and collect early signals before deciding whether extra reach makes sense.",
  },
  {
    icon: TrendingUp,
    title: "Send buyers straight to your product",
    body: "Paid plans add a direct website link from your public product page, giving interested visitors a clear path from discovery to your site.",
  },
  {
    icon: BarChart3,
    title: "Upgrade for deeper feedback loops",
    body: "Pro adds AI crawler insights and spotlight surfaces so you can see how automated discovery is growing.",
  },
] as const

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(0)}%`
}

function formatPlatformMetric(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return compactNumberFormatter.format(Math.max(0, value))
}

function toDisplayDrop(
  item: Awaited<ReturnType<typeof getHomepageFeedPage>>["items"][number],
): DisplayDrop {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    tagline: item.tagline,
    logo: item.logo,
    category: item.category,
    categorySlug: item.categorySlug,
    categories: item.categories,
    score: item.scoreCount,
    scoreCount: item.scoreCount,
    isSponsored: item.isSponsored,
    variant: item.variant,
    isVoted: item.isVoted,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
}

function isPlaceholderLogo(logo: string) {
  return /(?:placehold(?:er)?\.(?:com|co)|[-_/]600x400(?:[._/-]|$))/i.test(logo)
}

function ProductLogo({
  product,
  className,
}: {
  product: DisplayDrop
  className?: string
}) {
  const logo = product.logo?.trim()
  const shouldRenderLogo = Boolean(logo && !isPlaceholderLogo(logo))

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#061d31] text-sm font-black text-white shadow-sm",
        className,
      )}
    >
      {shouldRenderLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`${product.name} logo`}
          width={80}
          height={80}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials(product.name)}</span>
      )}
    </div>
  )
}

function HomepageHero() {
  return (
    <section className="border-b border-[#E2E8F0] bg-[#f8f9ff] text-[#0b1c30]">
      <div className="mx-auto flex min-h-[540px] max-w-[1200px] flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="mb-6 flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B] sm:flex-row sm:gap-3 sm:text-[11px]">
          <span className="text-[#0b1c30]">
            <PublicBuilderCountMessage />
          </span>
          <span className="hidden h-3 w-px bg-[#CBD5E1] sm:block" aria-hidden />
          <span>Launches, rankings, guides, and growth tools</span>
        </div>

        <h1 className="max-w-[940px] text-[38px] font-bold leading-[1.08] tracking-tight text-black md:text-[58px]">
          Launch your product. Discover what&apos;s next.
        </h1>

        <p className="mt-6 max-w-[760px] text-base leading-7 text-[#43474c]">
          Shipyard is an independent platform for product launches and
          discovery, with founder playbooks, free tools, public rankings, and
          practical signals that help good products keep moving.
        </p>

        <Link
          href={guidePath("product-launch-checklist")}
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#0051d5] underline decoration-[#0051d5]/30 underline-offset-4 hover:text-[#0048bf]"
        >
          See how to prepare a launch
          <ArrowRight className="size-4" aria-hidden />
        </Link>

        <form
          action={BROWSE_PATH}
          className="mt-9 flex w-full max-w-[720px] flex-col gap-2 rounded-xl border border-[#c4c6cd] bg-white p-1.5 shadow-sm focus-within:border-[#0051d5] focus-within:ring-2 focus-within:ring-[#0051d5]/10 sm:flex-row sm:items-center sm:gap-0"
          method="get"
        >
          <div className="flex min-w-0 flex-1 items-center">
            <Search
              className="ml-3 size-5 shrink-0 text-[#64748B]"
              aria-hidden
            />
            <label className="sr-only" htmlFor="homepage-product-search">
              Search products, categories, and tools
            </label>
            <input
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-[#0b1c30] outline-none placeholder:text-[#74777d]"
              id="homepage-product-search"
              name="q"
              placeholder="Search products, categories, and tools"
              type="search"
            />
          </div>
          <Button
            className="h-11 w-full rounded-lg border-0 bg-black px-5 text-sm font-semibold text-white shadow-none hover:bg-black/90 sm:h-10 sm:w-auto"
            type="submit"
          >
            Search
          </Button>
        </form>

        <div className="mt-6 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
          <Button
            asChild
            className="h-12 w-full rounded-lg border-0 bg-black px-7 text-sm font-semibold text-white shadow-none hover:bg-black/90 sm:w-auto"
          >
            <Link href={BROWSE_PATH}>Browse products</Link>
          </Button>
          <Button
            asChild
            className="h-12 w-full rounded-lg border border-[#c4c6cd] bg-white px-7 text-sm font-semibold text-black shadow-none hover:bg-[#F8FAFC] sm:w-auto"
          >
            <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
              Submit your product
            </Link>
          </Button>
        </div>

        <nav
          aria-label="Explore Shipyard"
          className="mt-9 grid w-full max-w-sm grid-cols-2 gap-x-4 gap-y-3 border-t border-[#E2E8F0] pt-5 text-xs text-[#43474c] sm:flex sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:gap-y-2"
        >
          {HOMEPAGE_EXPLORE_LINKS.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch={"prefetch" in item ? item.prefetch : undefined}
              className="inline-flex items-center justify-center gap-2 font-medium hover:text-black"
            >
              {index > 0 ? (
                <span className="mr-4 hidden size-1 rounded-full bg-[#CBD5E1] sm:inline-block" />
              ) : null}
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="relative isolate bg-[#F8FAFC] pb-20 text-[#0b1c30]">
      <CoreStructuredData
        scriptKeyPrefix="home"
        webPage={{ path: HOME_PATH, name: siteConfig.tagline }}
        breadcrumbs={{
          items: [{ name: "Home", path: HOME_PATH }],
        }}
      />

      <HomepageHero />
      <HomepageDataSections />
    </div>
  )
}

async function getCachedHomepageDataSections() {
  "use cache"
  applyCache(
    [
      TAGS.homepage,
      TAGS.products,
      TAGS.leaderboard,
      TAGS.analytics,
      TAGS.upvotes,
    ],
    DEFAULT_TTL.fast,
  )

  const [launchOfDay, homepageStats] = await Promise.all([
    getHomepageLaunchOfDay().catch(() => null),
    getLeaderboardStats().catch(() => ({
      totalProducts: null,
      totalCreators: null,
      totalUpvotes: null,
      totalScore: null,
      topScore: null,
      analyticsWindowDays: ANALYTICS_REPORTING_WINDOW_DAYS,
      pageViews: 0,
      visitors: 0,
      trafficSeries: [],
    })),
  ])

  const feedPage = await getHomepageFeedPage({
    page: 1,
    pageSize: HOMEPAGE_INITIAL_FEED_PAGE_SIZE,
    excludeProductIds: launchOfDay ? [launchOfDay.id] : [],
    launchWindow: "homepage",
  }).catch(() => ({
    items: [],
    page: 1,
    pageSize: HOMEPAGE_INITIAL_FEED_PAGE_SIZE,
    hasMore: false,
    nextPage: null,
    launchPeriod: null,
  }))

  return {
    feedPage,
    launchOfDay,
    homepageStats,
    referenceDateIso: new Date().toISOString(),
  }
}

async function HomepageDataSections() {
  const { feedPage, launchOfDay, homepageStats, referenceDateIso } =
    await getCachedHomepageDataSections()

  const feedProducts = feedPage.items.map(toDisplayDrop)
  const launch: DisplayDrop | null = launchOfDay
    ? {
        ...toDisplayDrop(launchOfDay),
        rank: launchOfDay.rank,
        score: launchOfDay.score,
        upvoteGrowthPercent: launchOfDay.upvoteGrowthPercent,
      }
    : (feedProducts[0] ?? null)
  const feedDrops = feedProducts.filter(
    (product) => !launch?.slug || product.slug !== launch.slug,
  )
  const drops = feedDrops
  const homepageVoteProductIds = Array.from(
    new Set(
      [launch?.id, ...drops.map((drop) => drop.id)].filter((id): id is string =>
        Boolean(id),
      ),
    ),
  )
  const launchGrowth = launch?.upvoteGrowthPercent
  const shouldDisplayLaunchMomentum =
    typeof launchGrowth === "number" && launchGrowth > 0
  const launchSignalLabel = shouldDisplayLaunchMomentum
    ? formatPercent(launchGrowth)
    : null
  const launchIsSponsored = Boolean(launch?.isSponsored)
  const launchIsEditorPick =
    !launchIsSponsored && launch?.variant === "promoted"
  const trafficWindowDays = Math.max(
    1,
    homepageStats.analyticsWindowDays ?? ANALYTICS_REPORTING_WINDOW_DAYS,
  )
  const trafficWindowLabel =
    formatAnalyticsReportingWindowLabel(trafficWindowDays)
  const platformMetrics = [
    {
      label: "Products",
      value: homepageStats.totalProducts,
    },
    {
      label: "Builders",
      value: homepageStats.totalCreators,
    },
    {
      label: "Total score",
      value: homepageStats.totalScore,
    },
  ] as const

  return (
    <HomepageVoteStateProvider productIds={homepageVoteProductIds}>
      <section
        className="mx-auto max-w-[1200px] px-4 pb-8 pt-12 sm:px-6"
        id="launch-board"
        style={{ contentVisibility: "auto", containIntrinsicSize: "520px" }}
      >
        <div className="mb-5 flex items-end justify-between gap-6 border-b border-[#E2E8F0] pb-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
              Live from the Shipyard
            </span>
            <h2 className="mt-2 text-[28px] font-bold leading-9 tracking-tight text-black sm:text-[32px] sm:leading-10">
              Featured launch
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474c]">
              One standout product from the launches earning attention on
              Shipyard today.
            </p>
          </div>
          <Link
            href={BROWSE_PATH}
            className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-[#0051d5] hover:text-[#0048bf] lg:inline-flex"
          >
            Browse all launches
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="grid overflow-hidden rounded-2xl border border-[#D7DEE8] bg-white shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)]">
          <article
            className={cn(
              "relative min-w-0 overflow-hidden",
              launchIsSponsored ? "bg-[#FFF7ED]" : "bg-[#F8FAFC]",
            )}
          >
            {launch ? (
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center justify-center border-r border-[#D7DEE8]/70 bg-white/30"
                >
                  <span
                    className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.22em] text-[#64748B]"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {launchIsSponsored ? "Sponsored" : "Featured"}
                  </span>
                </div>

                <div
                  aria-hidden
                  className="pointer-events-none absolute left-16 right-0 top-1/2 -translate-y-1/2 overflow-hidden whitespace-nowrap text-[72px] font-black leading-none tracking-[-0.06em]"
                  style={{ color: "rgba(11, 28, 48, 0.035)" }}
                >
                  {launch.name}
                </div>

                <div className="relative z-[1] flex min-h-[214px] flex-col items-start gap-5 py-6 pl-[68px] pr-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:py-7 sm:pl-[84px] sm:pr-8">
                  <div className="min-w-0 max-w-[430px]">
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold uppercase tracking-[0.11em]">
                      <span className="text-[#9A3412]">Launch of the Day</span>
                      {launchIsEditorPick ? (
                        <span className="text-[#0051d5]">
                          Editor&apos;s Pick
                        </span>
                      ) : null}
                      {launchSignalLabel ? (
                        <span className="inline-flex items-center gap-1 text-[#166534]">
                          <TrendingUp className="size-3" aria-hidden />
                          {launchSignalLabel} momentum
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-[23px] font-semibold leading-[1.18] tracking-[-0.025em] text-black sm:text-[27px] sm:leading-[1.16]">
                      <Link
                        href={
                          launch.slug ? productPath(launch.slug) : BROWSE_PATH
                        }
                        className="hover:text-[#0051d5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0051d5]"
                      >
                        <span className="sr-only">{launch.name}: </span>
                        {launch.tagline || launch.name}
                      </Link>
                    </h3>

                    <div className="mt-6 flex items-center gap-3">
                      <span className="w-7 border-t border-black" aria-hidden />
                      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#43474c]">
                        {launch.name}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={launch.slug ? productPath(launch.slug) : BROWSE_PATH}
                    aria-label={`View ${launch.name}`}
                    className="shrink-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0051d5]"
                  >
                    <ProductLogo
                      product={launch}
                      className="size-20 rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.16)] sm:size-24"
                    />
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex min-h-[214px] flex-col justify-center p-6">
                <span className="mb-3 w-fit text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A3412]">
                  Launch of the Day
                </span>
                <h3 className="text-2xl font-semibold leading-tight text-black">
                  No launch is live yet.
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-[#43474c]">
                  Real products will appear here as soon as launches are
                  published.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 border-t border-[#E2E8F0]/50 pt-4">
                  <Button
                    asChild
                    className="h-10 rounded-lg border-0 bg-black px-6 text-xs font-semibold uppercase tracking-[0.05em] text-white hover:bg-black/90"
                  >
                    <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                      Submit Product
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="h-10 rounded-lg border border-[#c4c6cd] bg-white px-6 text-xs font-semibold uppercase tracking-[0.05em] text-black shadow-none hover:bg-[#F8FAFC]"
                  >
                    <Link href={BROWSE_PATH}>Browse Products</Link>
                  </Button>
                </div>
              </div>
            )}
          </article>

          <div className="border-t border-[#E2E8F0] bg-[#f8f9ff] p-4 lg:border-l lg:border-t-0">
            <div className="grid grid-cols-3 gap-3 border-b border-[#D7DEE8] pb-3 sm:gap-8">
              {platformMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-2"
                >
                  <span className="text-lg font-bold leading-none text-black">
                    {formatPlatformMetric(metric.value)}
                  </span>
                  <span className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <VisitorSparkline
                series={homepageStats.trafficSeries}
                label={trafficWindowLabel}
              />
              <p className="text-right text-[9px] leading-4 text-[#64748B]">
                Powered by Cloudflare
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section
          className="my-14"
          id="drops"
          style={{ contentVisibility: "auto", containIntrinsicSize: "960px" }}
        >
          <div className="mb-8 flex flex-col items-start gap-5 border-b border-[#E2E8F0] pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
                Product discovery, in public
              </span>
              <h2 className="mt-2 text-[28px] font-bold leading-9 tracking-tight text-black sm:text-[32px] sm:leading-10">
                The live launch board
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474c]">
                Explore new apps, SaaS products, AI tools, APIs, and independent
                projects as they arrive—not months after the moment has passed.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                asChild
                className="h-10 flex-1 rounded-lg border border-[#E2E8F0] bg-white px-4 text-xs font-semibold uppercase tracking-[0.05em] text-black shadow-none hover:bg-[#F8FAFC] sm:flex-none"
              >
                <Link href={BROWSE_PATH}>Newest</Link>
              </Button>
              <Button
                asChild
                className="h-10 flex-1 rounded-lg border-0 bg-black px-4 text-xs font-semibold uppercase tracking-[0.05em] text-white hover:bg-black/90 sm:flex-none"
              >
                <Link href={LEADERBOARD_PATH}>Trending</Link>
              </Button>
            </div>
          </div>

          <HomepageDropsInfiniteList
            initialItems={drops}
            initialHasMore={feedPage.hasMore}
            initialNextPage={feedPage.nextPage}
            pageSize={feedPage.pageSize}
            launchPeriod={feedPage.launchPeriod ?? null}
            excludedProductId={launch?.id}
            excludedSlug={launch?.slug}
            referenceDateIso={referenceDateIso}
            afterFirstSectionSlot={<HomepageWhyExistsSection />}
            afterSecondSectionSlot={
              <div className="space-y-8">
                <HomepageVisibilityOptionsSection />
                <AnswerBlocks
                  heading="Shipyard, explained"
                  className="rounded-2xl border border-[#D7DEE8] bg-[#f8f9ff] p-5 sm:p-8"
                  blocks={[...HOMEPAGE_ANSWER_BLOCKS]}
                />
              </div>
            }
          />
        </section>
      </div>
    </HomepageVoteStateProvider>
  )
}

function HomepageWhyExistsSection() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#D7DEE8] bg-white shadow-sm">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-[#E2E8F0] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
            Beyond the listing
          </span>
          <h3 className="mt-3 max-w-xl text-2xl font-bold leading-8 tracking-tight text-black sm:text-3xl sm:leading-10">
            Shipyard is built for the whole launch journey.
          </h3>
          <div className="mt-5 max-w-xl space-y-4 text-sm leading-6 text-[#43474c]">
            <p>
              A permanent product page matters, but founders also need a better
              way to prepare, launch, learn, and stay visible after the first
              announcement fades.
            </p>
            <p>
              That is why the product feed now sits alongside useful rankings,
              plain-English guides, free launch tools, and signals that help
              turn attention into a clearer next move.
            </p>
          </div>
          <Link
            href={guidePath("submit-product-to-directories")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0051d5] hover:text-[#0048bf]"
          >
            Read the directory launch guide
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="grid bg-[#F8FAFC] md:grid-cols-2">
          {HOMEPAGE_VALUE_POINTS.map((point, index) => {
            const Icon = point.icon

            return (
              <article
                key={point.title}
                className={cn(
                  "min-h-[190px] p-6 sm:p-8",
                  index % 2 === 0 && "md:border-r md:border-[#E2E8F0]",
                  index < 2 && "md:border-b md:border-[#E2E8F0]",
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-white text-[#0051d5] shadow-sm ring-1 ring-[#E2E8F0]">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h4 className="mt-5 text-sm font-bold leading-5 text-black">
                  {point.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-[#43474c]">
                  {point.body}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HomepageVisibilityOptionsSection() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#D7DEE8] bg-white shadow-sm">
      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-[#061D31] p-6 text-white sm:p-8 lg:p-10">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9FE6B8]">
            Keep the launch moving
          </span>
          <h3 className="mt-3 max-w-lg text-2xl font-bold leading-8 tracking-tight sm:text-3xl sm:leading-10">
            Add reach when your product is ready for it.
          </h3>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#D0E4FF]">
            Paid plans should feel like launch acceleration, not a toll booth:
            use them when you want a longer visibility window, stronger
            placement, a direct product backlink, or deeper analytics for a
            product that is ready.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-11 rounded-lg border-0 bg-white px-5 text-sm font-semibold text-[#061D31] hover:bg-[#F8FAFC]"
            >
              <Link href={PRICING_PLANS_PATH}>Compare visibility options</Link>
            </Button>
            <Button
              asChild
              className="h-11 rounded-lg border border-white/20 bg-transparent px-5 text-sm font-semibold text-white shadow-none hover:bg-white/10"
            >
              <Link href={guidePath("product-launch-checklist")}>
                Read the launch checklist
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid divide-y divide-[#E2E8F0] md:grid-cols-3 md:divide-x md:divide-y-0">
          {HOMEPAGE_VISIBILITY_OPTIONS.map((option) => {
            const Icon = option.icon

            return (
              <article key={option.title} className="p-6 sm:p-8">
                <Icon className="mb-5 size-5 text-[#0051d5]" aria-hidden />
                <h4 className="text-sm font-bold leading-5 text-black">
                  {option.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-[#43474c]">
                  {option.body}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
