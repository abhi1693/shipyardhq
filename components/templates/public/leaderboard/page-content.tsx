import Link from "next/link"
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CreditCard,
  Megaphone,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react"

import { getSponsoredProducts } from "@/actions/public/products/featured"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { Image } from "@/components/atoms/image"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HomepageAnalyticsGrid } from "@/components/templates/public/common/HomepageAnalyticsGrid"
import { LeaderboardUpvoteButton } from "@/components/templates/public/leaderboard/leaderboard-upvote-button"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { DODO_AFFILIATE_URL } from "@/lib/marketing/affiliates"
import { getLeaderboardPagePayload } from "@/lib/leaderboard/cache"
import { buildProductInterestBadges } from "@/lib/products/interest"
import { mapProductCardRecordToBase } from "@/lib/products/selects"
import {
  BROWSE_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  categoryPath,
  productPath,
} from "@/lib/routes"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import { isOptimizedImageSrc } from "@/lib/images/sources"
import { cn } from "@/lib/utils"

type LeaderboardListItem = ProductCardBase & {
  rank: number
  scoreCount?: number
}

function formatBadgeLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDailyArchivePath(date = new Date()) {
  return `/leaderboard/daily/${date.getUTCFullYear()}/${
    date.getUTCMonth() + 1
  }/${date.getUTCDate()}`
}

function LeaderboardHero({
  categoryName,
  dailyArchivePath,
}: {
  categoryName?: string
  dailyArchivePath: string
}) {
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-[radial-gradient(at_0%_0%,rgba(208,228,255,0.5)_0px,transparent_50%),radial-gradient(at_100%_0%,rgba(219,225,255,0.5)_0px,transparent_50%)] px-6 py-12 text-center md:px-10">
      <h1 className="mb-1 text-[32px] font-bold leading-10 tracking-tight text-black">
        {categoryName ? `${categoryName} leaderboard` : "This month's leaderboard"}
      </h1>
      <p className="mx-auto mb-8 max-w-2xl text-[16px] leading-6 text-[#43474c]">
        Products are ranked by monthly upvotes, unique visitors, and page
        views. Updated every 6 hours.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button
          asChild
          className="h-12 rounded-lg bg-black px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-white hover:bg-black/90"
        >
          <Link href={MEMBER_PRODUCTS_PATH}>
            <Zap className="size-4" aria-hidden />
            Submit your launch
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 rounded-lg border-[#E2E8F0] bg-white px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-black hover:bg-[#F8FAFC]"
        >
          <Link href={LEADERBOARD_GUIDE_PATH}>
            <BookOpen className="size-4" aria-hidden />
            Review the ranking guide
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 rounded-lg border-[#E2E8F0] bg-white px-6 text-[12px] font-semibold uppercase tracking-[0.05em] text-black hover:bg-[#F8FAFC]"
        >
          <Link href={dailyArchivePath}>
            <Archive className="size-4" aria-hidden />
            Launch Archives
          </Link>
        </Button>
      </div>
    </section>
  )
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium leading-[14px]",
        className,
      )}
    >
      {children}
    </span>
  )
}

function LeaderboardProductCard({ item }: { item: LeaderboardListItem }) {
  const upvotes = item.analytics?.upvotes ?? 0
  const interestBadges = buildProductInterestBadges(item.interest, {
    maxBadges: 2,
    includeBuildersClicked: true,
  })
  const badgeLabels = item.badges?.slice(0, 2) ?? []
  const isTopRank = item.rank === 1

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border-[#E2E8F0] bg-white p-0 shadow-none transition-all hover:shadow-md",
        isTopRank && "border-[#F97316]/30",
      )}
    >
      {isTopRank ? (
        <BadgeCheck
          className="pointer-events-none absolute right-2 top-2 size-28 text-black/5"
          aria-hidden
        />
      ) : null}
      <CardContent className="flex gap-6 p-6">
        <Link
          href={productPath(item.slug)}
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
        >
          <Image
            src={item.logo}
            alt={`${item.name} logo`}
            width={48}
            height={48}
            sizes="48px"
            className="size-12 object-contain"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-2 text-[18px] font-semibold leading-6 text-black">
                <Link
                  href={productPath(item.slug)}
                  className="min-w-0 truncate underline-offset-4 hover:underline"
                >
                  {item.name}
                </Link>
                {item.sponsored ? (
                  <span className="rounded bg-[#F97316]/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-[10px] tracking-wider text-[#F97316]">
                    Sponsored
                  </span>
                ) : null}
              </h3>
              <p className="mt-1 line-clamp-2 text-[14px] leading-5 text-[#43474c]">
                {item.tagline}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  "mb-1 block text-[12px] font-semibold leading-4",
                  isTopRank ? "text-[#0051d5]" : "text-[#43474c]",
                )}
              >
                #{item.rank}
              </span>
              <LeaderboardUpvoteButton productSlug={item.slug} count={upvotes} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {item.category?.name && item.category.slug ? (
              <Link href={categoryPath(item.category.slug)}>
                <Pill className="bg-[#F8FAFC] uppercase text-[#43474c] hover:text-[#0051d5]">
                  {item.category.name}
                </Pill>
              </Link>
            ) : null}
            {interestBadges.map((badge) => (
              <Pill
                key={badge.key}
                className={
                  badge.variant === "success"
                    ? "bg-[#16a34a]/10 text-[#16a34a]"
                    : "bg-[#F8FAFC] text-[#43474c]"
                }
              >
                {badge.label}
              </Pill>
            ))}
            {badgeLabels.map((badge) => (
              <Pill key={badge} className="bg-[#F97316]/10 text-[#F97316]">
                <Trophy className="size-3.5" aria-hidden />
                {formatBadgeLabel(badge)}
              </Pill>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyLeaderboard() {
  return (
    <Card className="rounded-xl border-dashed border-[#E2E8F0] bg-white p-0 shadow-none">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <Trophy className="size-8 text-[#0051d5]" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-black">No contenders yet.</p>
          <p className="mt-1 text-xs text-[#43474c]">
            Invite your team or explore another category to discover early
            movers.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={BROWSE_PATH}>Browse products</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function PromotedShips({
  placements,
}: {
  placements: Awaited<ReturnType<typeof getSponsoredProducts>>
}) {
  const placement = placements[0]
  const product = placement?.product
  const bannerSrc = product?.bannerImage ?? null
  const logoSrc = product?.logo ?? null

  return (
    <Card className="rounded-xl border-[#E2E8F0] bg-white p-0 shadow-none">
      <CardContent className="p-6">
        <h4 className="mb-6 flex items-center gap-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#43474c]">
          <Sparkles
            className="size-[18px] text-[#F97316]"
            fill="currentColor"
            aria-hidden
          />
          Promoted Ships
        </h4>
        {product ? (
          <Link
            href={`/r/sponsored/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-[#061d31]">
              {isOptimizedImageSrc(bannerSrc) ? (
                <Image
                  src={bannerSrc}
                  alt={`${product.name} banner`}
                  width={360}
                  height={160}
                  sizes="(min-width: 1024px) 360px, 100vw"
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                />
              ) : isOptimizedImageSrc(logoSrc) ? (
                <Image
                  src={logoSrc}
                  alt={`${product.name} logo`}
                  width={64}
                  height={64}
                  sizes="64px"
                  className="size-16 object-contain"
                />
              ) : (
                <Megaphone className="size-12 text-white/70" aria-hidden />
              )}
            </div>
            <h5 className="mb-1 text-[18px] font-semibold leading-6 text-black underline-offset-4 group-hover:underline">
              {product.name}
            </h5>
            <p className="line-clamp-2 text-[14px] leading-5 text-[#43474c]">
              {product.tagline}
            </p>
          </Link>
        ) : (
          <Link
            href={PRICING_PATH}
            className="group block rounded-lg border-2 border-dashed border-[#E2E8F0] p-6 text-center transition-colors hover:bg-[#F8FAFC]"
          >
            <Megaphone
              className="mx-auto mb-2 size-10 text-[#c4c6cd] transition-transform group-hover:scale-110"
              aria-hidden
            />
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-black">
              Advertise here
            </div>
            <p className="mt-1 text-[11px] leading-[14px] text-[#43474c]">
              Get your product in front of builders monthly.
            </p>
          </Link>
        )}
        {product ? (
          <Link
            href={PRICING_PATH}
            className="mt-6 block rounded-lg border-2 border-dashed border-[#E2E8F0] p-6 text-center transition-colors hover:bg-[#F8FAFC]"
          >
            <Megaphone className="mx-auto mb-2 size-10 text-[#c4c6cd]" />
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-black">
              Advertise here
            </div>
            <p className="mt-1 text-[11px] leading-[14px] text-[#43474c]">
              Get your product in front of builders monthly.
            </p>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DodoPaymentsCard() {
  return (
    <Card className="group relative overflow-hidden rounded-xl border-0 bg-black p-0 text-white shadow-none">
      <CreditCard
        className="pointer-events-none absolute -bottom-4 -right-4 size-36 text-white/20 transition-transform duration-500 group-hover:scale-110"
        aria-hidden
      />
      <CardContent className="relative z-10 p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#C0FF00]">
            <Zap className="size-5 text-black" aria-hidden />
          </div>
          <span className="text-[12px] font-semibold uppercase tracking-widest text-[#C0FF00]">
            Dodo Payments
          </span>
        </div>
        <h4 className="mb-2 text-[18px] font-semibold leading-6">
          Take payments with the provider Shipyard uses
        </h4>
        <p className="mb-6 text-[14px] leading-5 text-white/80">
          We process Shipyard billing via Dodo Payments. If you&apos;re shipping
          a SaaS, it&apos;s a great starting point with global compliance
          built-in.
        </p>
        <Button
          asChild
          className="h-12 w-full rounded-lg bg-white text-[12px] font-semibold uppercase tracking-[0.05em] text-black hover:bg-[#C0FF00]"
        >
          <a href={DODO_AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
            Get started
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

export async function LeaderboardPageContent({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; limit?: string }>
}) {
  const sp = await searchParams
  const filters = {
    categorySlug: sp?.category,
    limit: Number(sp?.limit ?? 50),
  }

  const { stats, products, categoryName } = await getLeaderboardPagePayload(
    filters,
  )
  const now = new Date()
  const [interestMap, sponsoredPlacements] = await Promise.all([
    getProductInterestSignalsMap({
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
      })),
    }),
    getSponsoredProducts(1),
  ])

  const leaderboardItems: LeaderboardListItem[] = products.map(
    (product, index) => {
      const base = mapProductCardRecordToBase(product, now)

      return {
        ...base,
        rank: index + 1,
        interest: interestMap.get(base.id) ?? null,
      }
    },
  )

  return (
    <main className="bg-[#f8f9ff] px-6 py-6 text-[#0b1c30]">
      <div className="mx-auto max-w-[1200px] space-y-12">
        <LeaderboardHero
          categoryName={categoryName}
          dailyArchivePath={getDailyArchivePath(now)}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-8">
            {leaderboardItems.length > 0 ? (
              <>
                {leaderboardItems.slice(0, 10).map((item) => (
                  <LeaderboardProductCard key={item.id} item={item} />
                ))}
                <div className="flex justify-center pt-8">
                  <Link
                    href="/leaderboard/monthly"
                    className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#0051d5] underline-offset-4 hover:underline"
                  >
                    View full monthly leaderboard
                    <ArrowRight className="size-[18px]" aria-hidden />
                  </Link>
                </div>
              </>
            ) : (
              <EmptyLeaderboard />
            )}
          </section>
          <aside className="space-y-6 lg:col-span-4">
            <HomepageAnalyticsGrid initialStats={stats} />
            <PromotedShips placements={sponsoredPlacements} />
            <DodoPaymentsCard />
          </aside>
        </div>
      </div>
    </main>
  )
}

export function LeaderboardPageSkeleton() {
  return (
    <main className="bg-[#f8f9ff] px-6 py-6">
      <div className="mx-auto max-w-[1200px] space-y-12">
        <CardSkeleton className="h-72 rounded-xl border border-[#E2E8F0] bg-white" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton
                key={index}
                className="h-36 rounded-xl border border-[#E2E8F0] bg-white"
              />
            ))}
          </section>
          <aside className="space-y-6 lg:col-span-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <CardSkeleton
                key={index}
                className="h-56 rounded-xl border border-[#E2E8F0] bg-white"
              />
            ))}
          </aside>
        </div>
      </div>
    </main>
  )
}
