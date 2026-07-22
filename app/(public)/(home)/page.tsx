import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  Eye,
  Megaphone,
  MousePointerClick,
  Rocket,
  Search,
  TrendingUp,
  Trophy,
  Users,
  Wrench,
} from "lucide-react"

import {
  getHomepageFeedPage,
  getHomepageLaunchOfDay,
  type HomepageFeedItem,
} from "@/actions/public/homepage/feed"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { Button } from "@/components/atoms/button"
import { ProductCategoryPills } from "@/components/molecules/ProductCategoryPills"
import {
  HomepageDropsInfiniteList,
  HomepageVoteStateProvider,
} from "@/components/templates/public/homepage/homepage-client"
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

function VisitorSparkline({
  series,
  label,
}: {
  series: Array<{ visitors: number }> | null | undefined
  label: string
}) {
  const recentValues = (series ?? [])
    .slice(-ANALYTICS_REPORTING_WINDOW_DAYS)
    .map((point) => Math.max(0, point.visitors))
  const values = [
    ...Array(
      Math.max(0, ANALYTICS_REPORTING_WINDOW_DAYS - recentValues.length),
    ).fill(0),
    ...recentValues,
  ] as number[]
  const width = 320
  const height = 44
  const peakValue = Math.max(0, ...values)
  const maxValue = Math.max(1, peakValue)
  const linePoints = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width
      const y =
        peakValue === 0
          ? height / 2
          : height - 3 - (value / maxValue) * (height - 8)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`

  return (
    <svg
      aria-label={`Daily visitors over ${label.toLowerCase()}`}
      className="h-8 w-full overflow-visible"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polygon points={areaPoints} fill="#0051d5" opacity="0.08" />
      <polyline
        points={linePoints}
        fill="none"
        stroke="#0051d5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function HomepageHero() {
  return (
    <section className="border-b border-[#E2E8F0] bg-[#f8f9ff] text-[#0b1c30]">
      <div className="mx-auto flex min-h-[540px] max-w-[1200px] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          <span className="text-[#0b1c30]">
            <PublicBuilderCountMessage />
          </span>
          <span className="h-3 w-px bg-[#CBD5E1]" aria-hidden />
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
          className="mt-9 flex w-full max-w-[720px] items-center rounded-xl border border-[#c4c6cd] bg-white p-1.5 shadow-sm focus-within:border-[#0051d5] focus-within:ring-2 focus-within:ring-[#0051d5]/10"
          method="get"
        >
          <Search className="ml-3 size-5 shrink-0 text-[#64748B]" aria-hidden />
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
          <Button
            className="h-10 rounded-lg border-0 bg-black px-5 text-sm font-semibold text-white shadow-none hover:bg-black/90"
            type="submit"
          >
            Search
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            className="h-12 rounded-lg border-0 bg-black px-7 text-sm font-semibold text-white shadow-none hover:bg-black/90"
          >
            <Link href={BROWSE_PATH}>Browse products</Link>
          </Button>
          <Button
            asChild
            className="h-12 rounded-lg border border-[#c4c6cd] bg-white px-7 text-sm font-semibold text-black shadow-none hover:bg-[#F8FAFC]"
          >
            <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
              Submit your product
            </Link>
          </Button>
        </div>

        <nav
          aria-label="Explore Shipyard"
          className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[#E2E8F0] pt-5 text-xs text-[#43474c]"
        >
          {HOMEPAGE_EXPLORE_LINKS.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch={"prefetch" in item ? item.prefetch : undefined}
              className="inline-flex items-center gap-2 font-medium hover:text-black"
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
      icon: Rocket,
    },
    {
      label: "Builders",
      value: homepageStats.totalCreators,
      icon: Users,
    },
    {
      label: "Visitors",
      value: homepageStats.visitors,
      icon: Eye,
    },
    {
      label: "Upvotes",
      value: homepageStats.totalUpvotes,
      icon: MousePointerClick,
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
            <h2 className="mt-2 text-[32px] font-bold leading-10 tracking-tight text-black">
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
              "relative flex min-w-0 flex-col justify-center p-5",
              launchIsSponsored ? "bg-[#FFF7ED]" : "bg-white",
            )}
          >
            {launch ? (
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 items-start justify-between gap-6">
                  <div className="flex min-w-0 items-start gap-5">
                    <Link
                      href={
                        launch.slug ? productPath(launch.slug) : BROWSE_PATH
                      }
                      aria-label={`View ${launch.name}`}
                      className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0051d5]"
                    >
                      <ProductLogo product={launch} className="size-16" />
                    </Link>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A3412]">
                          Launch of the Day
                        </span>
                        {launchIsSponsored || launchIsEditorPick ? (
                          <span className="rounded-full border border-[#F97316]/40 bg-[#FDEADF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A33105]">
                            {launchIsSponsored ? "Sponsored" : "Editor's Pick"}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-2xl font-semibold leading-tight text-black">
                        <Link
                          href={
                            launch.slug ? productPath(launch.slug) : BROWSE_PATH
                          }
                          className="hover:text-[#0051d5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0051d5]"
                        >
                          {launch.name}
                        </Link>
                      </h3>
                      <p className="mt-1 max-w-lg text-sm leading-6 text-[#43474c]">
                        {launch.tagline}
                      </p>
                      <ProductCategoryPills
                        categories={launch.categories}
                        className="mt-3 gap-1.5"
                        pillClassName="rounded-none border-0 bg-transparent p-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#43474c]"
                        linkClassName="hover:text-[#0051d5]"
                      />
                    </div>
                  </div>
                  {launchSignalLabel ? (
                    <div className="hidden flex-col items-end sm:flex">
                      <div className="flex items-center gap-1.5 rounded bg-[#16a34a]/5 px-2 py-1">
                        <TrendingUp className="size-[18px] text-[#166534]" />
                        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#166534]">
                          {launchSignalLabel}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-48 flex-col justify-center">
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

          <Link
            href={LEADERBOARD_PATH}
            aria-label="View the Shipyard leaderboard and platform activity"
            className="group border-t border-[#E2E8F0] bg-[#f8f9ff] p-4 transition-colors hover:bg-[#F1F4FF] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0051d5] lg:border-l lg:border-t-0"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0051d5]">
                  Shipyard at a glance
                </span>
                <h3 className="mt-1 text-base font-semibold text-black">
                  Platform activity
                </h3>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#0051d5]">
                View leaderboard
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </div>

            <div className="mt-3 grid grid-cols-4 divide-x divide-[#D7DEE8] border-y border-[#D7DEE8] py-2">
              {platformMetrics.map((metric) => {
                const Icon = metric.icon

                return (
                  <div key={metric.label} className="min-w-0 px-3 first:pl-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#43474c]">
                        {metric.label}
                      </span>
                      <Icon
                        className="size-4 shrink-0 text-[#0051d5]"
                        aria-hidden
                      />
                    </div>
                    <div className="mt-2 text-xl font-bold leading-none text-black">
                      {formatPlatformMetric(metric.value)}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-2">
              <VisitorSparkline
                series={homepageStats.trafficSeries}
                label={trafficWindowLabel}
              />
              <p className="text-[9px] leading-4 text-[#64748B]">
                Visitors · {trafficWindowLabel} · Powered by Cloudflare
              </p>
            </div>
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section
          className="my-14"
          id="drops"
          style={{ contentVisibility: "auto", containIntrinsicSize: "960px" }}
        >
          <div className="mb-8 flex items-end justify-between gap-6 border-b border-[#E2E8F0] pb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
                Product discovery, in public
              </span>
              <h2 className="mt-2 text-[32px] font-bold leading-10 tracking-tight text-black">
                The live launch board
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474c]">
                Explore new apps, SaaS products, AI tools, APIs, and independent
                projects as they arrive—not months after the moment has passed.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-4 text-xs font-semibold uppercase tracking-[0.05em] text-black shadow-none hover:bg-[#F8FAFC]"
              >
                <Link href={BROWSE_PATH}>Newest</Link>
              </Button>
              <Button
                asChild
                className="h-10 rounded-lg border-0 bg-black px-4 text-xs font-semibold uppercase tracking-[0.05em] text-white hover:bg-black/90"
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
                  className="rounded-2xl border border-[#D7DEE8] bg-[#f8f9ff] p-8"
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
