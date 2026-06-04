import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  Rocket,
  TrendingUp,
} from "lucide-react"

import {
  getHomepageFeedPage,
  getHomepageLaunchOfDay,
} from "@/actions/public/homepage/feed"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { getHomepageBuilderSummary } from "@/actions/public/users/actions"
import { Button } from "@/components/atoms/button"
import { Image } from "@/components/atoms/image"
import {
  HomepageAnalyticsGrid,
  HomepageUpvoteButton,
  PartnerSpotlight,
} from "@/components/templates/public/homepage/homepage-client"
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
  slug?: string
  name: string
  tagline: string
  logo?: string | null
  category?: string | null
  upvoteCount: number
  score?: number | null
  rank?: number | null
  upvoteGrowthPercent?: number | null
  recommenderCount?: number
  recommenderAvatarUrls?: string[]
  buildersClickedCount?: number | null
  isSponsored?: boolean
  isVoted?: boolean
}

const fallbackLaunch: DisplayDrop = {
  slug: undefined,
  name: "VectorFlow AI",
  tagline:
    "Autonomous pipeline automation for modern engineering teams. Ship 3x faster with predictive CI/CD logic.",
  logo: null,
  category: "Dev Tools",
  upvoteCount: 1242,
  score: null,
  rank: null,
  upvoteGrowthPercent: null,
  recommenderCount: 1242,
  recommenderAvatarUrls: [],
  buildersClickedCount: null,
}

const fallbackDrops: DisplayDrop[] = [
  {
    name: "PrismLens",
    tagline: "Turn raw footage into cinematic shorts with one click.",
    category: "AI & Video",
    upvoteCount: 342,
  },
  {
    name: "NodeFlow",
    tagline: "Zero-latency API orchestration for edge computing.",
    category: "Dev Tools",
    upvoteCount: 189,
  },
  {
    name: "ScaleForce DB",
    tagline: "The only database designed for sub-millisecond global reads.",
    category: "Enterprise",
    upvoteCount: 0,
    isSponsored: true,
  },
]

const fallbackAvatarUrls = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Marcus",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Ada",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Lin",
]

const numberFormatter = new Intl.NumberFormat("en-US")

function formatCount(value: number) {
  return numberFormatter.format(Math.max(0, value))
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
    slug: item.slug,
    name: item.name,
    tagline: item.tagline,
    logo: item.logo,
    category: item.category,
    upvoteCount: item.upvoteCount,
    score: item.scoreCount,
    buildersClickedCount: item.interest?.uniqueVisitors7d ?? null,
    isSponsored: item.isSponsored,
    isVoted: item.isVoted,
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
  imageClassName,
}: {
  product: DisplayDrop
  className?: string
  imageClassName?: string
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
          className={cn("h-full w-full object-cover", imageClassName)}
          unoptimized
        />
      ) : (
        <span>{initials(product.name)}</span>
      )}
    </div>
  )
}

function AvatarStack({
  compact = false,
  featuredAvatarUrl,
  avatarUrls,
  countLabel,
}: {
  compact?: boolean
  featuredAvatarUrl?: string | null
  avatarUrls?: string[]
  countLabel?: string
}) {
  const sources = Array.from(
    new Set(
      [
        ...(avatarUrls ?? []),
        featuredAvatarUrl,
        ...fallbackAvatarUrls,
      ].filter(Boolean),
    ),
  ).slice(0, 3) as string[]

  return (
    <div className={cn("flex", compact ? "-space-x-1.5" : "-space-x-3")}>
      {sources.map((src) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={compact ? 24 : 40}
          height={compact ? 24 : 40}
          sizes={compact ? "24px" : "40px"}
          className={cn(
            "rounded-full border-2 border-white bg-[#d3e4fe]",
            compact ? "size-6" : "size-10",
          )}
          unoptimized
        />
      ))}
      {!compact ? (
        <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-[#d3e4fe] text-[11px] font-medium text-[#43474c]">
          +{countLabel ?? "0"}
        </div>
      ) : null}
    </div>
  )
}

function Sparkline({ sponsored = false }: { sponsored?: boolean }) {
  return (
    <svg
      className={cn(
        "h-10 w-full",
        sponsored ? "text-[#C0FF00]" : "text-[#16a34a]",
      )}
      fill="none"
      viewBox="0 0 100 40"
      aria-hidden="true"
    >
      <path
        d={
          sponsored
            ? "M0 30L20 28L40 32L60 15L80 5L100 12"
            : "M0 35C20 32 30 10 50 15C70 20 80 5 100 2"
        }
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function DropRow({ product, index }: { product: DisplayDrop; index: number }) {
  const sponsored = Boolean(product.isSponsored) || index === 2
  const href = product.slug ? productPath(product.slug) : BROWSE_PATH

  return (
    <article
      className={cn(
        "group relative flex cursor-pointer items-center gap-4 rounded-xl p-5 transition-all sm:gap-6",
        sponsored
          ? "border border-white/10 bg-[#213145] text-white hover:shadow-lg"
          : "border border-[#E2E8F0] bg-white hover:shadow-sm",
      )}
    >
      {sponsored ? (
        <div className="absolute right-2 top-2 flex items-center gap-1 text-white/60">
          <span className="text-[9px] font-extrabold uppercase leading-[10px] tracking-widest">
            Sponsored
          </span>
          <BadgeCheck className="size-3" aria-hidden />
        </div>
      ) : null}
      <ProductLogo
        product={product}
        className={cn(
          "size-14",
          sponsored
            ? "border border-white/20 bg-white/10"
            : "bg-[#e5eeff] text-[#061d31]",
        )}
        imageClassName={sponsored ? "contrast-125" : "h-10 w-10 object-cover"}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Link
            href={href}
            className="truncate text-lg font-semibold leading-6 hover:underline"
          >
            {product.name}
          </Link>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[9px] font-extrabold uppercase leading-[10px]",
              sponsored
                ? "bg-[#C0FF00] text-black"
                : "bg-[#F8FAFC] text-[#74777d]",
            )}
          >
            {product.category ?? "New Tool"}
          </span>
        </div>
        <p
          className={cn(
            "truncate text-sm leading-5",
            sponsored ? "text-white/70" : "text-[#43474c]",
          )}
        >
          {product.tagline}
        </p>
      </div>
      <div className="hidden w-32 px-4 md:block">
        <Sparkline sponsored={sponsored} />
      </div>
      {sponsored ? (
        <Button
          asChild
          className="h-14 min-w-16 rounded-r-xl rounded-l-none border-0 border-l border-white/10 bg-transparent pl-6 text-[#C0FF00] shadow-none hover:bg-white/10"
        >
          <Link href={href}>
            <Bolt className="size-4" aria-hidden />
            Deploy
          </Link>
        </Button>
      ) : (
        <div className="border-l border-[#E2E8F0] pl-4 sm:pl-6">
          <HomepageUpvoteButton
            productSlug={product.slug}
            initialCount={product.upvoteCount}
            initialUpvoted={product.isVoted}
            className="min-w-16 flex-col gap-0 rounded-r-xl bg-transparent px-3 py-2 text-[#0051d5] shadow-none hover:bg-[#EFF6FF]"
          />
        </div>
      )}
    </article>
  )
}

export default async function HomePage() {
  const [feedPage, launchOfDay, builderSummary, homepageStats] =
    await Promise.all([
      getHomepageFeedPage({ page: 1, pageSize: 6 }).catch(() => ({
        items: [],
        page: 1,
        pageSize: 6,
        hasMore: false,
        nextPage: null,
      })),
      getHomepageLaunchOfDay().catch(() => null),
      getHomepageBuilderSummary().catch(() => ({
        builderCount: 0,
        topFounder: null,
      })),
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
        recommenderCount: launchOfDay.recommenderCount,
        recommenderAvatarUrls: launchOfDay.recommenderAvatarUrls,
        buildersClickedCount: launchOfDay.buildersClickedCount,
      }
    : (feedProducts[0] ?? fallbackLaunch)
  const builderCount = builderSummary.builderCount
  const builderCountLabel = formatCount(builderCount)
  const builderNoun = pluralize(builderCount, "builder", "builders")
  const topFounder = builderSummary.topFounder
  const topFounderHref = topFounder ? userPath(topFounder.id) : "/users"
  const topFounderAvatarUrl = topFounder?.avatarUrl ?? fallbackAvatarUrls[0]
  const topFounderName = topFounder?.name ?? "Shipyard makers"
  const topFounderLine = topFounder
    ? formatFounderLine(topFounder)
    : "No public launches yet"
  const feedDrops = feedProducts.filter(
    (product) => !launch.slug || product.slug !== launch.slug,
  )
  const organicDrops = feedDrops.filter((product) => !product.isSponsored)
  const sponsoredDrop = feedDrops.find((product) => product.isSponsored)
  const drops = [
    organicDrops[0] ?? fallbackDrops[0],
    organicDrops[1] ?? fallbackDrops[1],
    sponsoredDrop ?? fallbackDrops[2],
  ]
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
    <div className="relative isolate bg-[#F8FAFC] pb-16 text-[#0b1c30]">
      <CoreStructuredData
        scriptKeyPrefix="home"
        webPage={{ path: HOME_PATH, name: siteConfig.tagline }}
        breadcrumbs={{
          items: [{ name: "Home", path: HOME_PATH }],
        }}
      />

      <section className="border-b border-[#E2E8F0] bg-[#f8f9ff]">
        <div className="mx-auto max-w-[1200px] px-4 py-16 text-center sm:px-6 md:py-24">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#16a34a]/10 px-4 py-1.5 text-[#16a34a]">
            <Rocket className="size-[18px] fill-current" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Join {builderCountLabel} top {builderNoun}
            </span>
          </div>
          <h1 className="mx-auto mb-6 max-w-4xl text-[40px] font-bold leading-[1.1] tracking-tight text-black md:text-[64px]">
            Ship the Next Big Thing.{" "}
            <br className="hidden md:block" />
            <span className="text-[#0051d5]">
              Discover the Best New Tools.
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-[#43474c]">
            Stop hunting through noise. Shipyard HQ is the high-performance
            discovery dashboard for builders to find traction and launch
            products to an audience that cares.
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
                <Image
                  className="size-10 rounded-full border-2 border-white bg-[#d3e4fe] shadow-sm"
                  src={topFounderAvatarUrl}
                  alt={topFounder ? `${topFounder.name} avatar` : ""}
                  width={40}
                  height={40}
                  sizes="40px"
                  unoptimized
                />
                <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#16a34a]" />
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
                productSlug={launch.slug}
                initialCount={launch.upvoteCount}
                initialUpvoted={launch.isVoted}
                fullLabel
                className="px-6"
              />
              <Button
                asChild
                className="h-10 rounded-lg border border-[#c4c6cd] bg-white px-6 text-xs font-semibold uppercase tracking-[0.05em] text-black shadow-none hover:bg-[#F8FAFC]"
              >
                <Link href={launch.slug ? productPath(launch.slug) : BROWSE_PATH}>
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
            <HomepageAnalyticsGrid initialStats={homepageStats} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section className="mb-12" id="drops">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-[32px] font-bold leading-10 tracking-tight text-black">
                Today&apos;s Drops
              </h3>
              <p className="text-sm leading-5 text-[#43474c]">
                Hand-picked innovations launching right now.
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

          <div className="space-y-3">
            {drops.map((product, index) => (
              <DropRow key={`${product.name}-${index}`} product={product} index={index} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              asChild
              className="h-12 rounded-lg border border-[#c4c6cd] bg-white px-8 text-lg font-semibold text-black shadow-none hover:bg-[#F8FAFC]"
            >
              <Link href={BROWSE_PATH}>Load more drops</Link>
            </Button>
          </div>
        </section>
      </div>

      <PartnerSpotlight />
    </div>
  )
}
