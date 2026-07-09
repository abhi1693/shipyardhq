import Link from "next/link"
import {
  BarChart3,
  Megaphone,
  MousePointerClick,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react"

import {
  getHomepageFeedPage,
  getHomepageLaunchOfDay,
} from "@/actions/public/homepage/feed"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { getHomepageBuilderSummaryPublic } from "@/actions/public/users/actions"
import { Button } from "@/components/atoms/button"
import {
  HomepageDropsInfiniteList,
  HomepageUpvoteButton,
  HomepageVoteStateProvider,
} from "@/components/templates/public/homepage/homepage-client"
import { AnswerBlocks } from "@/components/templates/public/common/AnswerBlocks"
import { LazyTrafficStatsPanel } from "@/components/templates/public/common/LazyTrafficStatsPanel"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  productPath,
} from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { siteConfig, siteGrowthMetrics } from "@/lib/siteConfig"
import { cn } from "@/lib/utils"
import { HOMEPAGE_INITIAL_FEED_PAGE_SIZE } from "@/lib/homepage/feed-constants"

const HOMEPAGE_TITLE = `${BRAND_NAME} - Launch Products Builders Discover`
const PRICING_PLANS_PATH = `${PRICING_PATH}#plans` as const

export const metadata = buildPageMetadata({
  title: HOMEPAGE_TITLE,
  description: `${BRAND_NAME} helps founders launch apps, SaaS tools, APIs, and startup projects with focused discovery, rankings, promotion, and analytics.`,
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
  score?: number | null
  scoreCount?: number | null
  rank?: number | null
  upvoteGrowthPercent?: number | null
  isSponsored?: boolean
  isVoted?: boolean
  publishedAt?: string | null
  createdAt?: string
}

type HomepageBuilderSummary = Awaited<
  ReturnType<typeof getHomepageBuilderSummaryPublic>
>

const HOMEPAGE_VALUE_POINTS = [
  {
    icon: Search,
    title: "Launch into an active feed",
    body: "Your product appears beside real launches, votes, and builder interest instead of sitting on a static directory page.",
  },
  {
    icon: MousePointerClick,
    title: "Learn what earns attention",
    body: "Clicks, votes, rankings, and traffic signals help you understand which positioning is landing with builders.",
  },
  {
    icon: Trophy,
    title: "Keep momentum visible",
    body: "Daily showcases and leaderboards give strong launches a place to keep earning discovery after the first spike.",
  },
] as const

const HOMEPAGE_VISIBILITY_OPTIONS = [
  {
    icon: Megaphone,
    title: "Start with a free listing",
    body: "Publish your product, join the launch feed, and collect early signals before deciding whether extra reach makes sense.",
  },
  {
    icon: Sparkles,
    title: "Add reach when timing matters",
    body: "Featured and priority placements help launch-ready products stay visible during the window you care about most.",
  },
  {
    icon: BarChart3,
    title: "Upgrade for deeper feedback loops",
    body: "Pro adds referrer insights and spotlight surfaces so you can see where attention comes from.",
  },
] as const

const fallbackBuilderSummary: HomepageBuilderSummary = {
  builderCount: siteGrowthMetrics.builderCount,
  topFounder: null,
}

const numberFormatter = new Intl.NumberFormat("en-US")

function formatCount(value: number) {
  return numberFormatter.format(Math.max(0, value))
}

function formatBuilderCountBadge(value: number) {
  const safeValue = Math.max(0, value)
  if (safeValue < 1000) {
    return formatCount(safeValue)
  }

  const roundedValue = Math.floor(safeValue / 100) * 100
  return `${formatCount(roundedValue)}+`
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(0)}%`
}

function pluralize(value: number, singular: string, plural: string) {
  return value === 1 ? singular : plural
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
    score: item.scoreCount,
    scoreCount: item.scoreCount,
    isSponsored: item.isSponsored,
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

function ProductLogo({
  product,
  className,
}: {
  product: DisplayDrop
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#061d31] text-sm font-black text-white shadow-sm",
        className,
      )}
    >
      {product.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.logo}
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

function HomepageHero({
  builderSummary,
}: {
  builderSummary: HomepageBuilderSummary
}) {
  const builderCount = Math.max(
    builderSummary.builderCount,
    siteGrowthMetrics.builderCount,
  )
  const builderCountLabel = formatBuilderCountBadge(builderCount)
  const builderNoun = pluralize(builderCount, "builder", "builders")

  return (
    <section className="border-b border-[#E2E8F0] bg-[#f8f9ff]">
      <div className="mx-auto max-w-[1200px] px-4 py-10 text-center sm:px-6 md:py-14">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#16a34a]/10 px-4 py-1.5 text-[#166534]">
          <Rocket className="size-[18px] fill-current" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Join {builderCountLabel} {builderNoun} launching in public
          </span>
        </div>
        <h1 className="mx-auto mb-5 max-w-4xl text-[38px] font-bold leading-[1.08] tracking-tight text-black md:text-[58px]">
          Launch your product where builders are already browsing.
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-[#43474c]">
          {BRAND_NAME} is a live launch board for apps, SaaS tools, APIs, and
          startup projects. Submit your product, earn votes and clicks, then add
          more reach only when the launch is ready for it.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            className="h-14 w-full rounded-xl border-0 bg-black px-10 text-base font-semibold text-white shadow-lg shadow-black/10 hover:scale-[0.98] hover:bg-black sm:w-auto"
          >
            <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
              Submit Your Product
            </Link>
          </Button>
          <Button
            asChild
            className="h-14 w-full rounded-xl border border-[#c4c6cd] bg-white px-10 text-base font-semibold text-black shadow-none hover:bg-[#F8FAFC] sm:w-auto"
          >
            <Link href={BROWSE_PATH}>Browse Today&apos;s Drops</Link>
          </Button>
        </div>
        <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
          <span>Free to submit</span>
          <span className="hidden h-1 w-1 rounded-full bg-[#CBD5E1] sm:block" />
          <span>Votes and builder clicks</span>
          <span className="hidden h-1 w-1 rounded-full bg-[#CBD5E1] sm:block" />
          <span>Optional visibility boosts</span>
        </div>
      </div>
    </section>
  )
}

async function HomepageHeroWithBuilderSummary() {
  const builderSummary = await getCachedHomepageBuilderSummary().catch(
    () => fallbackBuilderSummary,
  )

  return <HomepageHero builderSummary={builderSummary} />
}

async function getCachedHomepageBuilderSummary() {
  "use cache"
  applyCache([TAGS.homepage, TAGS.users, TAGS.products], DEFAULT_TTL.slow)

  return getHomepageBuilderSummaryPublic()
}

export default function HomePage() {
  return (
    <div className="relative isolate bg-[#F8FAFC] pb-16 text-[#0b1c30]">
      <CoreStructuredData
        scriptKeyPrefix="home"
        webPage={{ path: HOME_PATH, name: siteConfig.tagline }}
        breadcrumbs={{
          items: [{ name: "Home", path: HOME_PATH }],
        }}
      />

      <HomepageHeroWithBuilderSummary />
      <AnswerBlocks
        blocks={[
          {
            title: "What this page lists",
            body: `${BRAND_NAME} highlights current product launches, the launch of the day, public discovery stats, and recent products from the Shipyard launch directory.`,
          },
          {
            title: "Who it is for",
            body: "The homepage is for builders launching products, buyers browsing new software, and researchers looking for active apps, SaaS tools, APIs, AI products, and startup projects.",
          },
          {
            title: "How rankings work",
            body: "Homepage highlights use public Shipyard launch signals such as votes, ranking context, launch activity, sponsored eligibility, and recent product metadata.",
          },
          {
            title: "Freshness policy",
            body: "Homepage launch data revalidates frequently and updates as products are published, voted on, promoted, ranked, or refreshed in the public launch feed.",
          },
        ]}
      />
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
      pageViews30: 0,
      visitors30: 0,
      trafficSeries: [],
      realtimeVisitors: 1,
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

  return (
    <HomepageVoteStateProvider productIds={homepageVoteProductIds}>
      <section
        className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6"
        style={{ contentVisibility: "auto", containIntrinsicSize: "520px" }}
      >
        <div className="grid grid-cols-12 gap-6">
          <article
            className={cn(
              "relative col-span-12 flex h-full flex-col justify-between overflow-hidden rounded-xl border p-5 shadow-sm lg:col-span-8",
              launchIsSponsored
                ? "border-[#F59E0B]/45 bg-[#FFF7ED]"
                : "border-[#E2E8F0] bg-white",
            )}
          >
            {launch ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <ProductLogo product={launch} className="size-16" />
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold leading-none">
                          {launch.name}
                        </h2>
                        <span className="rounded-full bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9A3412]">
                          Launch of the Day
                        </span>
                        {launchIsSponsored ? (
                          <span className="rounded-full border border-[#F97316]/40 bg-[#FDEADF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A33105]">
                            Sponsored
                          </span>
                        ) : null}
                      </div>
                      <p className="max-w-lg text-sm leading-snug text-[#43474c]">
                        {launch.tagline}
                      </p>
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

                <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-[#E2E8F0]/50 pt-4">
                  <HomepageUpvoteButton
                    productId={launch.id}
                    productSlug={launch.slug}
                    initialCount={launch.score}
                    initialUpvoted={launch.isVoted}
                    fullLabel
                    hideZeroCount
                    className="px-6"
                  />
                  <Button
                    asChild
                    className="h-10 rounded-lg border border-[#c4c6cd] bg-white px-6 text-xs font-semibold uppercase tracking-[0.05em] text-black shadow-none hover:bg-[#F8FAFC]"
                  >
                    <Link
                      href={
                        launch.slug ? productPath(launch.slug) : BROWSE_PATH
                      }
                    >
                      View Product
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex min-h-44 flex-col justify-center">
                <span className="mb-3 w-fit rounded-full bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9A3412]">
                  Launch of the Day
                </span>
                <h2 className="text-2xl font-semibold leading-tight text-black">
                  No launch is live yet.
                </h2>
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

          <div className="col-span-12 lg:col-span-4">
            <LazyTrafficStatsPanel
              initialStats={homepageStats}
              className="h-full"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section
          className="my-12"
          id="drops"
          style={{ contentVisibility: "auto", containIntrinsicSize: "960px" }}
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-[32px] font-bold leading-10 tracking-tight text-black">
                Latest Launches
              </h3>
              <p className="text-sm leading-5 text-[#43474c]">
                Fresh products from today, yesterday, and recent launch windows
                earning builder attention.
              </p>
            </div>
            <div className="flex gap-1">
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
            afterTodaySlot={<HomepageWhyExistsSection />}
            afterYesterdaySlot={<HomepageVisibilityOptionsSection />}
          />
        </section>
      </div>
    </HomepageVoteStateProvider>
  )
}

function HomepageWhyExistsSection() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#D7DEE8] bg-white shadow-sm">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
            Why this exists
          </span>
          <h3 className="mt-3 max-w-xl text-2xl font-bold leading-8 tracking-tight text-black sm:text-3xl sm:leading-10">
            Most makers do not need another quiet listing page.
          </h3>
          <div className="mt-5 max-w-xl space-y-4 text-sm leading-6 text-[#43474c]">
            <p>
              We built {BRAND_NAME} for the messy part after you ship: getting
              enough useful attention to know what is working. The feed, votes,
              clicks, rankings, and analytics are here to help a launch turn
              into a clearer next move.
            </p>
            <p>
              Start free. If a launch is ready for more visibility, paid plans
              add reach around the same surfaces builders are already using.
            </p>
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="divide-y divide-[#D7DEE8]">
            {HOMEPAGE_VALUE_POINTS.map((point) => {
              const Icon = point.icon

              return (
                <article
                  key={point.title}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#0051d5] shadow-sm ring-1 ring-[#E2E8F0]">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold leading-5 text-black">
                      {point.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-6 text-[#43474c]">
                      {point.body}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
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
            Visibility options
          </span>
          <h3 className="mt-3 max-w-lg text-2xl font-bold leading-8 tracking-tight sm:text-3xl sm:leading-10">
            Upgrade when extra reach has a job to do.
          </h3>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#D0E4FF]">
            Paid plans should feel like launch acceleration, not a toll booth:
            use them when you want a longer visibility window, stronger
            placement, or deeper analytics for a product that is ready.
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
              <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                Submit first
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
