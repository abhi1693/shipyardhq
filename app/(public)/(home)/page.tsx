import { getPublicPlans } from "@/actions/public/plans/actions"
import {
  formatPricingOfferPrice,
  getDiscountedPriceCents,
} from "@/lib/pricing/offer"
import Link from "next/link"
import { Suspense } from "react"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  Megaphone,
  MousePointerClick,
  TrendingUp,
  Trophy,
} from "lucide-react"

import {
  getHomepageFeedPage,
  getHomepageLaunchOfDay,
  type HomepageFeedItem,
} from "@/lib/server/homepage/feed"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { Button } from "@/components/atoms/button"
import { ProductLogoImage } from "@/components/atoms/product-logo-image"
import { HomepageDiscoveryLayout } from "@/components/templates/public/homepage/HomepageDiscoveryLayout"
import {
  HomepageDropsInfiniteList,
  HomepageVoteStateProvider,
} from "@/components/templates/public/homepage/homepage-client"
import { VisitorSparkline } from "@/components/templates/public/homepage/VisitorSparkline"
import { PublicBuilderCountMessage } from "@/components/templates/public/common/PublicBuilderCountMessage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  guidePath,
  productCardPath,
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

const HOMEPAGE_TITLE = "Product Discovery and Launch Platform"
const PRICING_PLANS_PATH = `${PRICING_PATH}#plans` as const
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export const metadata = buildPageMetadata({
  title: HOMEPAGE_TITLE,
  description: `Put your product in front of people looking for what to try next. ${BRAND_NAME} combines launch discovery, rankings, founder tools, and analytics from product-page visit to website click.`,
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
    title: "See what turns into traffic",
    body: "Track product visits, votes, rankings, and website clicks to see which positioning moves people from discovery to your product.",
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

const HOMEPAGE_VISIBILITY_OPTIONS = [
  {
    icon: Megaphone,
    title: "Start with a free listing",
    body: "Publish your product, join the launch feed, and collect early signals before deciding whether extra reach makes sense.",
  },
  {
    icon: TrendingUp,
    title: "Turn interest into measurable visits",
    body: "Give interested visitors a clear path to your product and see the website clicks Shipyard delivers in your launch analytics.",
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
      <ProductLogoImage
        src={shouldRenderLogo ? logo : null}
        name={product.name}
        optimizationWidth={96}
        width={96}
        height={96}
        sizes="48px"
        loading="lazy"
        className="h-full w-full object-cover"
        fallbackClassName="bg-transparent text-white"
      />
    </div>
  )
}

function HomepageHero() {
  return (
    <section className="border-b border-[#E2E8F0] bg-[#f8f9ff] text-[#0b1c30]">
      <div className="mx-auto flex min-h-[540px] max-w-[1200px] flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16 xl:pt-12">
        <div className="mb-6 flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B] sm:flex-row sm:gap-3 sm:text-[11px]">
          <span className="text-[#0b1c30]">
            <PublicBuilderCountMessage />
          </span>
          <span className="hidden h-3 w-px bg-[#CBD5E1] sm:block" aria-hidden />
          <span>Discovery measured beyond the listing</span>
        </div>

        <h1 className="max-w-[940px] text-[38px] font-bold leading-[1.08] tracking-tight text-black md:text-[58px]">
          Launch where people discover what to try next.
        </h1>

        <p className="mt-6 max-w-[760px] text-base leading-7 text-[#43474c]">
          List your product free, get in front of people actively looking for
          new tools, and see exactly how many visits and website clicks you
          earn.
        </p>

        <div className="mt-6 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
          <Button
            asChild
            className="h-12 w-full rounded-lg border-0 bg-black px-7 text-sm font-semibold text-white shadow-none hover:bg-black/90 sm:w-auto"
          >
            <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
              Submit your product free
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 w-full rounded-lg border border-[#c4c6cd] bg-white px-7 text-sm font-semibold text-black shadow-none hover:bg-[#F8FAFC] sm:w-auto"
          >
            <Link href={BROWSE_PATH}>Browse products</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div
      data-homepage
      className="relative isolate bg-[#F8FAFC] pb-20 text-[#0b1c30]"
    >
      <CoreStructuredData
        scriptKeyPrefix="home"
        webPage={{ path: HOME_PATH, name: siteConfig.tagline }}
        breadcrumbs={{
          items: [{ name: "Home", path: HOME_PATH }],
        }}
      />

      <HomepageHero />
      {/* TODO: Add 2–3 approved maker testimonials here, including unpaid
          listings. Each needs the maker name, product, listing URL, exact quote,
          verified website clicks, and reporting dates. Do not use sample quotes. */}
      <Suspense
        fallback={
          <div
            role="status"
            className="mx-auto max-w-7xl px-4 py-12 text-sm text-slate-600 sm:px-6 lg:px-8"
          >
            Loading products and launch highlights…
          </div>
        }
      >
        <HomepageDataSections />
      </Suspense>
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
      websiteClicks: null,
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
    : null
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
  const launchHref = launch?.slug
    ? productCardPath(launch.slug, { sponsored: launchIsSponsored })
    : BROWSE_PATH
  const launchRedirectsToWebsite = Boolean(launch?.slug && launchIsSponsored)
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
      label: "Tracked clicks",
      value: homepageStats.websiteClicks,
    },
  ] as const

  return (
    <HomepageVoteStateProvider productIds={homepageVoteProductIds}>
      <HomepageDiscoveryLayout
        sponsoredLaunch={
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
                  Sponsored launch
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474c]">
                  One active Pro product gets Shipyard&apos;s highest-visibility
                  homepage launch slot.
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

            <div className="grid overflow-hidden rounded-2xl border border-[#D7DEE8] bg-white shadow-sm @[1024px]/public-ad:grid-cols-[minmax(0,1fr)_minmax(520px,1fr)]">
              <article
                className={cn(
                  "relative min-w-0 overflow-hidden",
                  launchIsSponsored ? "bg-[#FFF7ED]" : "bg-[#F8FAFC]",
                )}
              >
                {launch ? (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center justify-center border-r border-[#D7DEE8]/70 bg-white/30">
                      <span
                        className="rounded border border-[#9A3412] bg-white px-2 py-1 text-xs font-semibold text-[#9A3412]"
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                        }}
                      >
                        Sponsored
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
                          <span className="text-[#9A3412]">
                            Launch of the Day
                          </span>
                          {launchSignalLabel ? (
                            <span className="inline-flex items-center gap-1 text-[#166534]">
                              <TrendingUp className="size-3" aria-hidden />
                              {launchSignalLabel} momentum
                            </span>
                          ) : null}
                        </div>

                        <h3 className="text-[23px] font-semibold leading-[1.18] tracking-[-0.025em] text-black sm:text-[27px] sm:leading-[1.16]">
                          <Link
                            href={launchHref}
                            prefetch={
                              launchRedirectsToWebsite ? false : undefined
                            }
                            target={
                              launchRedirectsToWebsite ? "_blank" : undefined
                            }
                            rel={
                              launchRedirectsToWebsite
                                ? "noopener noreferrer sponsored"
                                : undefined
                            }
                            className="hover:text-[#0051d5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0051d5]"
                          >
                            <span className="sr-only">{launch.name}: </span>
                            {launch.tagline || launch.name}
                          </Link>
                        </h3>

                        <div className="mt-6 flex items-center gap-3">
                          <span
                            className="w-7 border-t border-black"
                            aria-hidden
                          />
                          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#43474c]">
                            {launch.name}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={launchHref}
                        prefetch={launchRedirectsToWebsite ? false : undefined}
                        target={launchRedirectsToWebsite ? "_blank" : undefined}
                        rel={
                          launchRedirectsToWebsite
                            ? "noopener noreferrer sponsored"
                            : undefined
                        }
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
                      Paid slot available
                    </span>
                    <h3 className="text-2xl font-semibold leading-tight text-black">
                      Put your launch in this slot.
                    </h3>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-[#43474c]">
                      This paid Launch of the Day placement is included only
                      with an active Pro plan.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-[#E2E8F0]/50 pt-4">
                      <Button
                        asChild
                        className="h-10 rounded-lg border-0 bg-black px-6 text-xs font-semibold uppercase tracking-[0.05em] text-white hover:bg-black/90"
                      >
                        <Link href={PRICING_PLANS_PATH}>View Pro pricing</Link>
                      </Button>
                      <Button
                        asChild
                        className="h-10 rounded-lg border border-[#c4c6cd] bg-white px-6 text-xs font-semibold uppercase tracking-[0.05em] text-black shadow-none hover:bg-[#F8FAFC]"
                      >
                        <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
                          Submit Product
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </article>

              <div className="border-t border-[#E2E8F0] bg-[#f8f9ff] p-4 @[1024px]/public-ad:border-l @[1024px]/public-ad:border-t-0">
                <h3 className="mb-3 text-sm font-semibold text-[#0b1c30]">
                  Across Shipyard
                </h3>
                <p className="mb-4 text-xs leading-5 text-[#43474c]">
                  Visitors and tracked website clicks across Shipyard over{" "}
                  {trafficWindowLabel.toLowerCase()}. Products and builders are
                  platform totals, not this launch’s results.
                </p>
                {/* TODO: Add a verified Pro launch case study with product-level
                    visitors, website clicks, reporting dates, and a listing link.
                    Never attribute homepageStats to the sponsored product. */}
                <div className="grid grid-cols-3 gap-3 border-b border-[#D7DEE8] pb-3 sm:gap-8">
                  {platformMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-2"
                    >
                      <span className="text-lg font-bold leading-none text-black">
                        {formatPlatformMetric(metric.value)}
                      </span>
                      <span className="text-xs font-semibold text-[#475569]">
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
        }
      >
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
                  Explore new apps, SaaS products, AI tools, APIs, and
                  independent projects as they arrive—not months after the
                  moment has passed.
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
                <>
                  <HomepageVisibilityOptionsSection />
                  <HomepagePlanComparison />
                </>
              }
            />
          </section>
        </div>
      </HomepageDiscoveryLayout>
    </HomepageVoteStateProvider>
  )
}

function HomepageWhyExistsSection() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#D7DEE8] bg-white shadow-sm">
      <div className="grid @[1024px]/public-ad:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-[#E2E8F0] p-6 sm:p-8 @[1024px]/public-ad:border-b-0 @[1024px]/public-ad:border-r @[1024px]/public-ad:p-10">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0051d5]">
            Built for buyer action
          </span>
          <h3 className="mt-3 max-w-xl text-2xl font-bold leading-8 tracking-tight text-black sm:text-3xl sm:leading-10">
            A listing should create buyer action, not just another citation.
          </h3>
          <div className="mt-5 max-w-xl space-y-4 text-sm leading-6 text-[#43474c]">
            <p>
              A permanent product page matters, but the real job is to help the
              right people discover it, understand it, and click through when it
              solves a problem they have.
            </p>
            <p>
              That is why Shipyard connects its launch feed to rankings,
              high-intent browse paths, founder tools, and website-click
              measurement that shows whether attention became traffic.
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

        <div className="grid bg-[#F8FAFC] @[768px]/public-ad:grid-cols-2">
          {HOMEPAGE_VALUE_POINTS.map((point, index) => {
            const Icon = point.icon

            return (
              <article
                key={point.title}
                className={cn(
                  "min-h-[190px] p-6 sm:p-8",
                  index % 2 === 0 &&
                    "@[768px]/public-ad:border-r @[768px]/public-ad:border-[#E2E8F0]",
                  index < 2 &&
                    "@[768px]/public-ad:border-b @[768px]/public-ad:border-[#E2E8F0]",
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
      <div className="grid @[1024px]/public-ad:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-[#061D31] p-6 text-white sm:p-8 @[1024px]/public-ad:p-10">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9FE6B8]">
            Keep the launch moving
          </span>
          <h3 className="mt-3 max-w-lg text-2xl font-bold leading-8 tracking-tight sm:text-3xl sm:leading-10">
            Add reach when your product is ready for it.
          </h3>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#D0E4FF]">
            Paid plans should feel like launch acceleration, not a toll booth:
            use them when you want a longer visibility window, stronger
            placement, more qualified website visits, or deeper analytics for a
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

        <div className="grid divide-y divide-[#E2E8F0] @[768px]/public-ad:grid-cols-3 @[768px]/public-ad:divide-x @[768px]/public-ad:divide-y-0">
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

async function HomepagePlanComparison() {
  const plans = await getPublicPlans().catch(() => [])
  const pro = plans.find(
    (plan) =>
      plan.name.toLowerCase() === "pro" && plan.type === "one_time_price",
  )
  return (
    <section
      aria-label="Free and Pro launch options"
      className="mt-6 grid overflow-hidden rounded-2xl border border-[#D7DEE8] bg-white shadow-sm sm:grid-cols-2"
    >
      <article className="border-b border-[#E2E8F0] p-6 sm:border-b-0 sm:border-r sm:p-8">
        <h3 className="text-2xl font-bold text-black">Free</h3>
        <p className="mt-2 text-lg font-semibold text-black">$0</p>
        <ul className="my-6 space-y-3 text-sm text-[#43474c]">
          <li>Public product listing</li>
          <li>Placement in the launch feed</li>
          <li>Basic votes, visits, and website clicks</li>
        </ul>
        <Button asChild className="bg-black text-white hover:bg-black/90">
          <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
            Start free
          </Link>
        </Button>
      </article>
      <article className="bg-[#f8f9ff] p-6 sm:p-8">
        <h3 className="text-2xl font-bold text-black">Pro</h3>
        <p className="mt-2 text-lg font-semibold text-black">
          {pro
            ? `${formatPricingOfferPrice(getDiscountedPriceCents(pro))} one-time / product`
            : "See current Pro pricing"}
        </p>
        {pro ? (
          <p className="mt-1 text-sm text-[#43474c]">
            Launch boost for {pro.boostForDays} days.
          </p>
        ) : null}
        {/* TODO: Confirm the current Pro price if the public plan catalog is unavailable. */}
        <ul className="my-6 space-y-3 text-sm text-[#43474c]">
          <li>Everything in Free</li>
          <li>Eligibility for the rotating homepage sponsored slot</li>
          <li>AI crawler insights</li>
          <li>Deeper launch analytics</li>
        </ul>
        <Button asChild variant="outline">
          <Link href={PRICING_PLANS_PATH}>See Pro</Link>
        </Button>
      </article>
    </section>
  )
}
