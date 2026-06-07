import Link from "next/link"
import { Suspense } from "react"
import { ArrowRight, Rocket, TrendingUp } from "lucide-react"

import {
  getHomepageFeedPage,
  getHomepageLaunchOfDay,
} from "@/actions/public/homepage/feed"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { getHomepageBuilderSummary } from "@/actions/public/users/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { Button } from "@/components/atoms/button"
import { Image } from "@/components/atoms/image"
import {
  HomepageDropsInfiniteList,
  HomepageUpvoteButton,
  HomepageVoteStateProvider,
} from "@/components/templates/public/homepage/homepage-client"
import { LazyTrafficStatsPanel } from "@/components/templates/public/common/LazyTrafficStatsPanel"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  productPath,
  userPath,
} from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { cn } from "@/lib/utils"

export const revalidate = 60

const HOMEPAGE_TITLE = "Shipyard HQ - Ship Better, Faster"

export const metadata = buildPageMetadata({
  title: HOMEPAGE_TITLE,
  description:
    "Shipyard HQ is the high-performance discovery dashboard for builders to find traction and launch products to an audience that cares.",
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
  buildersClickedCount?: number | null
  isSponsored?: boolean
  isVoted?: boolean
  publishedAt?: string | null
  createdAt?: string
}

const fallbackLaunch: DisplayDrop = {
  slug: undefined,
  name: "VectorFlow AI",
  tagline:
    "Autonomous pipeline automation for modern engineering teams. Ship 3x faster with predictive CI/CD logic.",
  logo: null,
  score: null,
  rank: null,
  upvoteGrowthPercent: null,
  buildersClickedCount: null,
}

const fallbackDrops: DisplayDrop[] = [
  {
    name: "PrismLens",
    tagline: "Turn raw footage into cinematic shorts with one click.",
    category: "AI & Video",
  },
  {
    name: "NodeFlow",
    tagline: "Zero-latency API orchestration for edge computing.",
    category: "Dev Tools",
  },
  {
    name: "ScaleForce DB",
    tagline: "The only database designed for sub-millisecond global reads.",
    category: "Enterprise",
    isSponsored: true,
  },
]

type HomepageBuilderSummary = Awaited<
  ReturnType<typeof getHomepageBuilderSummary>
>

const fallbackBuilderSummary: HomepageBuilderSummary = {
  builderCount: 1600,
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

function formatBuildersClickedLabel(value: number) {
  const safeValue = Math.max(0, value)
  return `${formatCount(safeValue)} ${pluralize(
    safeValue,
    "builder",
    "builders",
  )} clicked`
}

function formatFounderLine(founder: {
  productCount: number
  topProductName: string | null
}) {
  if (!founder.topProductName) {
    return `${formatCount(founder.productCount)} published ${pluralize(
      founder.productCount,
      "drop",
      "drops",
    )}`
  }

  const remainingDrops = Math.max(0, founder.productCount - 1)
  if (remainingDrops === 0) {
    return `Built ${founder.topProductName}`
  }

  return `Built ${founder.topProductName} & ${formatCount(
    remainingDrops,
  )} other ${pluralize(remainingDrops, "drop", "drops")}`
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
    buildersClickedCount: item.interest?.uniqueVisitors7d ?? null,
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
        <Image
          src={product.logo}
          alt={`${product.name} logo`}
          width={80}
          height={80}
          sizes="80px"
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span>{initials(product.name)}</span>
      )}
    </div>
  )
}

function MakerAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  const fallbackInitials = initials(name) || "SY"

  return (
    <Avatar className="size-10 border-2 border-white bg-[#d3e4fe] text-sm font-bold text-[#061d31] shadow-sm">
      {avatarUrl ? (
        <AvatarImage
          className="h-full w-full object-cover"
          src={avatarUrl}
          alt={`${name} avatar`}
          width={40}
          height={40}
        />
      ) : null}
      <AvatarFallback className="bg-[#d3e4fe] text-sm font-bold uppercase text-[#061d31]">
        {fallbackInitials}
      </AvatarFallback>
    </Avatar>
  )
}

function HomepageHero({
  builderSummary,
}: {
  builderSummary: HomepageBuilderSummary
}) {
  const builderCount = builderSummary.builderCount
  const builderCountLabel = formatBuilderCountBadge(builderCount)
  const builderNoun = pluralize(builderCount, "builder", "builders")
  const topFounder = builderSummary.topFounder
  const topFounderHref = topFounder ? userPath(topFounder.id) : "/users"
  const topFounderName = topFounder?.name ?? "Shipyard makers"
  const topFounderLine = topFounder
    ? formatFounderLine(topFounder)
    : "No public launches yet"

  return (
    <section className="border-b border-[#E2E8F0] bg-[#f8f9ff]">
      <div className="mx-auto max-w-[1200px] px-4 py-16 text-center sm:px-6 md:py-24">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#16a34a]/10 px-4 py-1.5 text-[#16a34a]">
          <Rocket className="size-[18px] fill-current" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Join {builderCountLabel} top {builderNoun}
          </span>
        </div>
        <h1 className="mx-auto mb-6 max-w-4xl text-[40px] font-bold leading-[1.1] tracking-tight text-black md:text-[64px]">
          Ship the Next Big Thing. <br className="hidden md:block" />
          <span className="text-[#0051d5]">Discover the Best New Tools.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-[#43474c]">
          Stop hunting through noise. Shipyard HQ is the high-performance
          discovery dashboard for builders to find traction and launch products
          to an audience that cares.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            className="h-14 w-full rounded-xl border-0 bg-black px-10 text-base font-semibold text-white shadow-lg shadow-black/10 hover:scale-[0.98] hover:bg-black sm:w-auto"
          >
            <Link href={MEMBER_PRODUCTS_ADD_PATH}>Submit Your Product</Link>
          </Button>
          <Button
            asChild
            className="h-14 w-full rounded-xl border border-[#c4c6cd] bg-white px-10 text-base font-semibold text-black shadow-none hover:bg-[#F8FAFC] sm:w-auto"
          >
            <Link href={BROWSE_PATH}>Browse Today&apos;s Drops</Link>
          </Button>
        </div>

        <div className="mt-12 flex items-center justify-center">
          <Link
            href={topFounderHref}
            className="group flex items-center gap-3 rounded-full border border-[#E2E8F0] bg-[#eff4ff] py-2 pl-2 pr-6 transition-colors hover:bg-[#dce9ff]"
          >
            <div className="relative">
              <MakerAvatar
                name={topFounderName}
                avatarUrl={topFounder?.avatarUrl}
              />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-black">
                  {topFounderName}
                </span>
                <span className="rounded-full bg-[#0051d5]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#0051d5]">
                  {topFounder ? "Top Maker" : "Makers"}
                </span>
              </div>
              <p className="text-[11px] font-medium leading-[14px] text-[#43474c]">
                {topFounderLine}
              </p>
            </div>
            <ArrowRight className="size-[18px] text-[#74777d] transition-all group-hover:translate-x-0.5 group-hover:text-[#0051d5]" />
          </Link>
        </div>
      </div>
    </section>
  )
}

async function HomepageHeroWithBuilderSummary() {
  const builderSummary = await getHomepageBuilderSummary().catch(
    () => fallbackBuilderSummary,
  )

  return <HomepageHero builderSummary={builderSummary} />
}

function HomepageDataSectionsSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6" aria-hidden>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 h-56 rounded-xl border border-[#E2E8F0] bg-white shadow-sm lg:col-span-8" />
        <div className="col-span-12 grid grid-cols-1 gap-3 lg:col-span-4">
          <div className="h-36 rounded-xl border border-[#E2E8F0] bg-white shadow-sm" />
          <div className="h-16 rounded-xl bg-[#00162a]" />
        </div>
      </div>
    </div>
  )
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

      <Suspense
        fallback={<HomepageHero builderSummary={fallbackBuilderSummary} />}
      >
        <HomepageHeroWithBuilderSummary />
      </Suspense>

      <Suspense fallback={<HomepageDataSectionsSkeleton />}>
        <HomepageDataSections />
      </Suspense>
    </div>
  )
}

async function HomepageDataSections() {
  const [feedPage, launchOfDay, homepageStats] = await Promise.all([
    getHomepageFeedPage({
      page: 1,
      pageSize: 20,
      launchWindow: "week",
    }).catch(() => ({
      items: [],
      page: 1,
      pageSize: 20,
      hasMore: false,
      nextPage: null,
    })),
    getHomepageLaunchOfDay().catch(() => null),
    getLeaderboardStats().catch(() => ({
      pageViews30: 0,
      visitors30: 0,
      trafficSeries: [],
      realtimeVisitors: 1,
    })),
  ])

  const feedProducts = feedPage.items.map(toDisplayDrop)
  const launch = launchOfDay
    ? {
        ...toDisplayDrop(launchOfDay),
        rank: launchOfDay.rank,
        score: launchOfDay.score,
        upvoteGrowthPercent: launchOfDay.upvoteGrowthPercent,
        buildersClickedCount: launchOfDay.buildersClickedCount,
      }
    : (feedProducts[0] ?? fallbackLaunch)
  const feedDrops = feedProducts.filter(
    (product) => !launch.slug || product.slug !== launch.slug,
  )
  const usingFallbackDrops = feedPage.items.length === 0
  const drops =
    feedDrops.length > 0 ? feedDrops : usingFallbackDrops ? fallbackDrops : []
  const homepageVoteProductIds = Array.from(
    new Set(
      [launch.id, ...drops.map((drop) => drop.id)].filter((id): id is string =>
        Boolean(id),
      ),
    ),
  )
  const referenceDateIso = new Date().toISOString()
  const launchGrowth = launch.upvoteGrowthPercent
  const launchBuildersClickedCount = launch.buildersClickedCount ?? 0
  const launchSignalLabel =
    typeof launchGrowth === "number"
      ? formatPercent(launchGrowth)
      : launch.rank
        ? `#${launch.rank}`
        : "New"
  const launchSignalIsPositive =
    typeof launchGrowth !== "number" || launchGrowth >= 0

  return (
    <HomepageVoteStateProvider productIds={homepageVoteProductIds}>
      <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="grid grid-cols-12 gap-6">
          <article className="relative col-span-12 flex h-full flex-col justify-between overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm lg:col-span-8">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <ProductLogo product={launch} className="size-16" />
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold leading-none">
                      {launch.name}
                    </h2>
                    <span className="rounded-full bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F97316]">
                      Launch of the Day
                    </span>
                  </div>
                  <p className="max-w-lg text-sm leading-snug text-[#43474c]">
                    {launch.tagline}
                  </p>
                </div>
              </div>
              <div className="hidden flex-col items-end sm:flex">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-1",
                    launchSignalIsPositive
                      ? "bg-[#16a34a]/5"
                      : "bg-[#ba1a1a]/5",
                  )}
                >
                  <TrendingUp
                    className={cn(
                      "size-[18px]",
                      launchSignalIsPositive
                        ? "text-[#16a34a]"
                        : "text-[#ba1a1a]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.05em]",
                      launchSignalIsPositive
                        ? "text-[#16a34a]"
                        : "text-[#ba1a1a]",
                    )}
                  >
                    {launchSignalLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-[#E2E8F0]/50 pt-4">
              <HomepageUpvoteButton
                productId={launch.id}
                productSlug={launch.slug}
                initialCount={launch.score ?? 0}
                initialUpvoted={launch.isVoted}
                countIncrement={10}
                syncResponseCount={false}
                fullLabel
                className="px-6"
              />
              <Button
                asChild
                className="h-10 rounded-lg border border-[#c4c6cd] bg-white px-6 text-xs font-semibold uppercase tracking-[0.05em] text-black shadow-none hover:bg-[#F8FAFC]"
              >
                <Link
                  href={launch.slug ? productPath(launch.slug) : BROWSE_PATH}
                >
                  View Product
                </Link>
              </Button>
              <div className="ml-auto flex items-center">
                <span className="text-[11px] font-medium leading-[14px] text-[#43474c]">
                  {formatBuildersClickedLabel(launchBuildersClickedCount)}
                </span>
              </div>
            </div>
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
        <section className="mb-12" id="drops">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-[32px] font-bold leading-10 tracking-tight text-black">
                Latest Launches
              </h3>
              <p className="text-sm leading-5 text-[#43474c]">
                Fresh products from today, yesterday, and this week.
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
            initialHasMore={!usingFallbackDrops && feedPage.hasMore}
            initialNextPage={feedPage.nextPage}
            pageSize={feedPage.pageSize}
            excludedSlug={launch.slug}
            referenceDateIso={referenceDateIso}
          />
        </section>
      </div>
    </HomepageVoteStateProvider>
  )
}
