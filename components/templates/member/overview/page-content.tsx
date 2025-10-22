import { Suspense } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { currentUser } from "@clerk/nextjs/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import RangeSelector from "@/components/molecules/RangeSelector"
import CreateButton from "@/components/molecules/CreateButton"
import { Skeleton } from "@/components/atoms/skeleton"
import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import {
  getUserDashboardStats,
  getUserProducts,
  getUnverifiedProducts,
  getUserDrafts,
  getTopProductsByMetric,
  getExpiringBadges,
  getNewBadgeProducts,
  type NewBadgeProduct,
  getProductsNeedingMedia,
  getRecentActivity,
  getProductHealthSummary,
} from "@/actions/member/overview/actions"
import { getMemberRewardsSnapshot } from "@/actions/member/rewards/actions"
import {
  MEMBER_PRODUCTS_ADD_PATH,
  MEMBER_PRODUCTS_PATH,
  MEMBER_REWARDS_PATH,
  memberProductPath,
  memberProductsStatusPath,
  memberProductsVerificationPath,
} from "@/lib/routes"
import { BADGE_OPTIONS } from "@/lib/constants"

type SearchParams = { range?: string }

type DashboardStats = Awaited<ReturnType<typeof getUserDashboardStats>>
type DraftProduct = Awaited<ReturnType<typeof getUserDrafts>>[number]
type ActivityItem = Awaited<ReturnType<typeof getRecentActivity>>[number]
type ExpiringBadge = Awaited<ReturnType<typeof getExpiringBadges>>[number]
type NeedsMediaProduct = Awaited<
  ReturnType<typeof getProductsNeedingMedia>
>[number]
type UnverifiedProduct = Awaited<
  ReturnType<typeof getUnverifiedProducts>
>[number]

type SimpleTaskItem = { id: string; name: string; timestamp?: Date }

type Highlight = {
  title: string
  body: string
  href?: string
  cta?: string
}

export async function MemberOverviewPageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)

  const statsPromise = getUserDashboardStats(days)
  const userPromise = currentUser()
  const rewardsPromise = getMemberRewardsSnapshot()
  const recentProductsPromise = getUserProducts(6, days)
  const unverifiedPromise = getUnverifiedProducts(3)
  const draftsPromise = getUserDrafts(3)
  const topByClicksPromise = getTopProductsByMetric("clicks", 3, days)
  const topByUpvotesPromise = getTopProductsByMetric("upvotes", 3, days)
  const expiringBadgesPromise = getExpiringBadges(4, 14)
  const freshBadgesPromise = getNewBadgeProducts(18)
  const needsMediaPromise = getProductsNeedingMedia(2, 4)
  const activityPromise = getRecentActivity(days, 8)
  const healthPromise = getProductHealthSummary(days)

  return (
    <Suspense fallback={<OverviewPageSkeleton />}>
      <OverviewPageWithStats
        statsPromise={statsPromise}
        userPromise={userPromise}
        rewardsPromise={rewardsPromise}
        recentProductsPromise={recentProductsPromise}
        unverifiedPromise={unverifiedPromise}
        draftsPromise={draftsPromise}
        topByClicksPromise={topByClicksPromise}
        topByUpvotesPromise={topByUpvotesPromise}
        expiringBadgesPromise={expiringBadgesPromise}
        freshBadgesPromise={freshBadgesPromise}
        needsMediaPromise={needsMediaPromise}
        activityPromise={activityPromise}
        healthPromise={healthPromise}
        days={days}
        rangeKey={sp?.range}
      />
    </Suspense>
  )
}

async function OverviewPageWithStats({
  statsPromise,
  userPromise,
  rewardsPromise,
  recentProductsPromise,
  unverifiedPromise,
  draftsPromise,
  topByClicksPromise,
  topByUpvotesPromise,
  expiringBadgesPromise,
  freshBadgesPromise,
  needsMediaPromise,
  activityPromise,
  healthPromise,
  days,
  rangeKey,
}: {
  statsPromise: ReturnType<typeof getUserDashboardStats>
  userPromise: ReturnType<typeof currentUser>
  rewardsPromise: ReturnType<typeof getMemberRewardsSnapshot>
  recentProductsPromise: ReturnType<typeof getUserProducts>
  unverifiedPromise: ReturnType<typeof getUnverifiedProducts>
  draftsPromise: ReturnType<typeof getUserDrafts>
  topByClicksPromise: ReturnType<typeof getTopProductsByMetric>
  topByUpvotesPromise: ReturnType<typeof getTopProductsByMetric>
  expiringBadgesPromise: ReturnType<typeof getExpiringBadges>
  freshBadgesPromise: ReturnType<typeof getNewBadgeProducts>
  needsMediaPromise: ReturnType<typeof getProductsNeedingMedia>
  activityPromise: ReturnType<typeof getRecentActivity>
  healthPromise: ReturnType<typeof getProductHealthSummary>
  days: number
  rangeKey?: string
}) {
  const stats = await statsPromise

  if (stats.totalProducts === 0) {
    return <OverviewZeroState />
  }

  return (
    <div className="space-y-10">
      <Suspense fallback={<HeroSectionSkeleton />}>
        <HeroSection
          stats={stats}
          userPromise={userPromise}
          days={days}
          rangeKey={rangeKey}
        />
      </Suspense>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Suspense fallback={<QuickTasksSkeleton />}>
            <QuickTasksSection
              stats={stats}
              unverifiedPromise={unverifiedPromise}
              draftsPromise={draftsPromise}
              needsMediaPromise={needsMediaPromise}
              expiringBadgesPromise={expiringBadgesPromise}
            />
          </Suspense>

          <Suspense fallback={<MomentumSectionSkeleton />}>
            <MomentumSection
              topByClicksPromise={topByClicksPromise}
              topByUpvotesPromise={topByUpvotesPromise}
              days={days}
            />
          </Suspense>

          <Suspense fallback={<SignalsSectionSkeleton />}>
            <SignalsSection
              activityPromise={activityPromise}
              healthPromise={healthPromise}
            />
          </Suspense>
        </div>

        <aside className="space-y-6">
          <Suspense fallback={<HighlightCardSkeleton />}>
            <HighlightCard
              stats={stats}
              unverifiedPromise={unverifiedPromise}
              draftsPromise={draftsPromise}
              needsMediaPromise={needsMediaPromise}
              expiringBadgesPromise={expiringBadgesPromise}
              topByClicksPromise={topByClicksPromise}
              days={days}
            />
          </Suspense>

          <Suspense fallback={<RewardsCardSkeleton />}>
            <RewardsCard rewardsPromise={rewardsPromise} />
          </Suspense>

          <Suspense fallback={<FreshBadgesCardSkeleton />}>
            <FreshBadgesCard freshBadgesPromise={freshBadgesPromise} />
          </Suspense>

          <Suspense fallback={<RecentLaunchesCardSkeleton />}>
            <RecentLaunchesCard recentProductsPromise={recentProductsPromise} />
          </Suspense>
        </aside>
      </div>
    </div>
  )
}

async function HeroSection({
  stats,
  userPromise,
  days,
  rangeKey,
}: {
  stats: DashboardStats
  userPromise: ReturnType<typeof currentUser>
  days: number
  rangeKey?: string
}) {
  const user = await userPromise

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  const emailHandle = primaryEmail ? primaryEmail.split("@")[0] : null
  const shortName =
    user?.firstName ?? user?.username ?? emailHandle ?? "Shipmate"
  const displayName = user?.fullName ?? shortName
  const planLabel = stats.plan?.name ? `${stats.plan.name} plan` : null

  const rangeLabel = (rangeKey ?? "7d").toUpperCase()
  const rangeDescriptor = rangeDescriptorForDays(days)

  const lifetimeSummary =
    stats.totalClicks > 0 || stats.totalUpvotes > 0
      ? `Your launches have gathered ${formatNumber(stats.totalClicks)} clicks and ${formatNumber(stats.totalUpvotes)} upvotes so far.`
      : "Invite your audience to explore your listings to start gathering clicks and upvotes."

  const heroStats = [
    {
      label: "Live products",
      value: formatNumber(stats.totalProducts),
    },
    {
      label: "Drafts in queue",
      value: formatNumber(stats.draftsCount),
    },
    {
      label: "Verified rate",
      value: `${stats.verifiedRate}%`,
    },
  ]

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.28] bg-gradient-to-br from-white/95 via-white/88 to-sky-50/70 p-6 shadow-[0_32px_80px_-72px_rgba(11,79,135,0.75)] sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--brand-1)/0.18,transparent_55%)]"
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
            <span className="rounded-full border border-[color:var(--brand-1)/0.35] bg-white/80 px-3 py-1 text-[10px] text-[color:var(--brand-1)]">
              Member Command Deck
            </span>
            <span className="rounded-full border border-[color:var(--brand-1)/0.22] bg-white/70 px-3 py-1 text-[10px] text-[color:var(--brand-1)]/80">
              {rangeLabel}
            </span>
            {planLabel ? (
              <span className="rounded-full border border-[color:var(--brand-1)/0.22] bg-white/70 px-3 py-1 text-[10px] text-[color:var(--brand-1)]/80">
                {planLabel}
              </span>
            ) : null}
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[32px]">
              Welcome back, {displayName}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Here&apos;s what shifted {rangeDescriptor}. {lifetimeSummary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CreateButton asChild label="Add product">
              <Link href={MEMBER_PRODUCTS_ADD_PATH}>Add product</Link>
            </CreateButton>
            <Button asChild variant="outline" size="sm">
              <Link href={MEMBER_PRODUCTS_PATH}>View products</Link>
            </Button>
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:items-end">
          <RangeSelector />
          <div className="grid w-full gap-3 sm:min-w-[240px] sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[color:var(--brand-1)/0.18] bg-white/90 px-3 py-2 text-left shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

async function QuickTasksSection({
  stats,
  unverifiedPromise,
  draftsPromise,
  needsMediaPromise,
  expiringBadgesPromise,
}: {
  stats: DashboardStats
  unverifiedPromise: ReturnType<typeof getUnverifiedProducts>
  draftsPromise: ReturnType<typeof getUserDrafts>
  needsMediaPromise: ReturnType<typeof getProductsNeedingMedia>
  expiringBadgesPromise: ReturnType<typeof getExpiringBadges>
}) {
  const [unverified, drafts, needsMedia, expiringBadges] = await Promise.all([
    unverifiedPromise,
    draftsPromise,
    needsMediaPromise,
    expiringBadgesPromise,
  ])

  const taskItems: Record<
    "unverified" | "drafts" | "media" | "badges",
    SimpleTaskItem[]
  > = {
    unverified: (unverified as UnverifiedProduct[]).map((product) => ({
      id: product.id,
      name: product.name,
      timestamp: product.createdAt,
    })),
    drafts: (drafts as DraftProduct[]).map((draft) => ({
      id: draft.id,
      name: draft.name,
      timestamp: draft.updatedAt,
    })),
    media: (needsMedia as NeedsMediaProduct[]).map((product) => ({
      id: product.id,
      name: product.name,
      timestamp: product.updatedAt,
    })),
    badges: (expiringBadges as ExpiringBadge[]).map((badge) => ({
      id: badge.id,
      name: badge.product.name,
      timestamp: badge.expiresAt ?? undefined,
    })),
  }

  const taskCards = [
    {
      key: "unverified" as const,
      title: "Verify domains",
      count: stats.unverifiedCount,
      description: "Keep trust signals strong by completing TXT verification.",
      href: memberProductsVerificationPath("unverified"),
      items: taskItems.unverified,
    },
    {
      key: "drafts" as const,
      title: "Finish drafts",
      count: stats.draftsCount,
      description: "Polish copy and screenshots before launch.",
      href: memberProductsStatusPath("draft"),
      items: taskItems.drafts,
    },
    {
      key: "media" as const,
      title: "Add visuals",
      count: needsMedia.length,
      description: "Fresh screenshots help conversions.",
      href: MEMBER_PRODUCTS_PATH,
      items: taskItems.media,
    },
    {
      key: "badges" as const,
      title: "Expiring badges",
      count: expiringBadges.length,
      description: "Renew perks before they lapse.",
      href: MEMBER_PRODUCTS_PATH,
      items: taskItems.badges,
    },
  ]

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {taskCards.map((card) => {
        const { key, ...rest } = card
        return <TaskCollection key={key} {...rest} />
      })}
    </section>
  )
}

async function MomentumSection({
  topByClicksPromise,
  topByUpvotesPromise,
  days,
}: {
  topByClicksPromise: ReturnType<typeof getTopProductsByMetric>
  topByUpvotesPromise: ReturnType<typeof getTopProductsByMetric>
  days: number
}) {
  const [topByClicks, topByUpvotes] = await Promise.all([
    topByClicksPromise,
    topByUpvotesPromise,
  ])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Momentum intel
        </h2>
        <p className="text-xs text-muted-foreground">
          Spot the launches that are resonating right now.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Most clicked</CardTitle>
            <CardDescription>
              Products winning attention this period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topByClicks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No click data yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topByClicks.slice(0, 5).map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <Link
                      href={memberProductPath(product.id)}
                      className="truncate font-medium text-slate-900 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(product.analytics?.clicks ?? 0)} clicks
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Most upvoted</CardTitle>
            <CardDescription>
              Community favorites from the range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topByUpvotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upvote data yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topByUpvotes.slice(0, 5).map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <Link
                      href={memberProductPath(product.id)}
                      className="truncate font-medium text-slate-900 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(product.analytics?.upvotes ?? 0)} upvotes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

async function SignalsSection({
  activityPromise,
  healthPromise,
}: {
  activityPromise: ReturnType<typeof getRecentActivity>
  healthPromise: ReturnType<typeof getProductHealthSummary>
}) {
  const [activity, health] = await Promise.all([activityPromise, healthPromise])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Signal &amp; stability
        </h2>
        <p className="text-xs text-muted-foreground">
          Keep a pulse on the latest events and health of your fleet.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>
              Latest events impacting your products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notable activity yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.slice(0, 6).map((item) => (
                  <li
                    key={`${item.type}-${item.product.id}-${item.ts.toISOString()}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col">
                      <Link
                        href={memberProductPath(item.product.id)}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {renderActivityLabel(item)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(item.ts)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Product health</CardTitle>
            <CardDescription>
              Average completeness across your portfolio: {health.averageScore}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-500"
                style={{
                  width: `${Math.min(100, Math.max(0, health.averageScore))}%`,
                }}
              />
            </div>
            {health.suggestions.length === 0 ? (
              <p className="text-muted-foreground">
                Everything looks sharp — keep shipping!
              </p>
            ) : (
              <ul className="space-y-2">
                {health.suggestions.slice(0, 4).map((suggestion) => (
                  <li
                    key={suggestion.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-slate-900">{suggestion.label}</span>
                    <Link
                      href={suggestion.href ?? MEMBER_PRODUCTS_PATH}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Fix it →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

async function HighlightCard({
  stats,
  unverifiedPromise,
  draftsPromise,
  needsMediaPromise,
  expiringBadgesPromise,
  topByClicksPromise,
  days,
}: {
  stats: DashboardStats
  unverifiedPromise: ReturnType<typeof getUnverifiedProducts>
  draftsPromise: ReturnType<typeof getUserDrafts>
  needsMediaPromise: ReturnType<typeof getProductsNeedingMedia>
  expiringBadgesPromise: ReturnType<typeof getExpiringBadges>
  topByClicksPromise: ReturnType<typeof getTopProductsByMetric>
  days: number
}) {
  const [unverified, drafts, needsMedia, expiringBadges, topByClicks] =
    await Promise.all([
      unverifiedPromise,
      draftsPromise,
      needsMediaPromise,
      expiringBadgesPromise,
      topByClicksPromise,
    ])

  const highlight = buildHighlight({
    stats,
    unverified: unverified as UnverifiedProduct[],
    drafts: drafts as DraftProduct[],
    needsMedia: needsMedia as NeedsMediaProduct[],
    expiringBadges: expiringBadges as ExpiringBadge[],
    topByClicks,
    days,
  })

  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">Next best move</CardTitle>
        <CardDescription>
          Prioritized from what changed {rangeDescriptorForDays(days)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="font-medium text-slate-900">{highlight.title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {highlight.body}
        </p>
      </CardContent>
      {highlight.href ? (
        <CardFooter>
          <Link
            href={highlight.href}
            className="text-sm font-semibold text-[color:var(--brand-1)] hover:underline"
          >
            {highlight.cta ?? "Open"} →
          </Link>
        </CardFooter>
      ) : null}
    </Card>
  )
}

async function RewardsCard({
  rewardsPromise,
}: {
  rewardsPromise: ReturnType<typeof getMemberRewardsSnapshot>
}) {
  const rewardsSnapshot = await rewardsPromise

  const rewardsBalance = rewardsSnapshot.balance.balance
  const rewardsLifetimeEarned = rewardsSnapshot.balance.lifetimeEarned
  const rewardsLifetimeSpent = rewardsSnapshot.balance.lifetimeSpent
  const rewardsStreakTier = rewardsSnapshot.balance.currentStreakTier
  const rewardsStreakCount = rewardsSnapshot.balance.currentStreakCount
  const hasRewardsStreak =
    (rewardsStreakTier && rewardsStreakTier.length > 0) ||
    rewardsStreakCount > 0
  const lastEarnedLabel = rewardsSnapshot.balance.lastEarnedAt
    ? `Earned ${formatRelative(rewardsSnapshot.balance.lastEarnedAt)}`
    : "Haven’t earned rewards yet"
  const lastRedeemedLabel = rewardsSnapshot.balance.lastRedeemedAt
    ? `Redeemed ${formatRelative(rewardsSnapshot.balance.lastRedeemedAt)}`
    : "No redemptions yet"

  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Rewards balance</CardTitle>
        <CardDescription>Shipyard rewards ready to redeem.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-slate-900">
            {formatNumber(rewardsBalance)}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            points
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Earned {formatNumber(rewardsLifetimeEarned)}</span>
          <span aria-hidden>•</span>
          <span>Spent {formatNumber(rewardsLifetimeSpent)}</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{lastEarnedLabel}</p>
          <p>{lastRedeemedLabel}</p>
        </div>
        {hasRewardsStreak ? (
          <Badge
            variant="secondary"
            className="mt-1 w-fit gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium"
          >
            {rewardsStreakTier ? <span>{rewardsStreakTier}</span> : null}
            <span>Streak ×{formatNumber(rewardsStreakCount)}</span>
          </Badge>
        ) : null}
      </CardContent>
      <CardFooter>
        <Link
          href={MEMBER_REWARDS_PATH}
          className="text-sm font-semibold text-[color:var(--brand-1)] hover:underline"
        >
          Open rewards →
        </Link>
      </CardFooter>
    </Card>
  )
}

async function FreshBadgesCard({
  freshBadgesPromise,
}: {
  freshBadgesPromise: ReturnType<typeof getNewBadgeProducts>
}) {
  const freshBadges = await freshBadgesPromise

  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Fresh off the deck</CardTitle>
        <CardDescription>
          Products sporting the New Launch badge.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {freshBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No new badge launches right now.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {freshBadges.map((entry: NewBadgeProduct) => {
              const badgeDef = BADGE_OPTIONS.find(
                (option) => option.value === entry.badge,
              )

              return (
                <li key={entry.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={memberProductPath(entry.product.id)}
                      className="truncate font-medium text-slate-900 hover:underline"
                    >
                      {entry.product.name}
                    </Link>
                    <Badge
                      variant="secondary"
                      className="gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      <span>{badgeDef?.icon ?? "🏷️"}</span>
                      <span>{badgeDef?.label ?? entry.badge}</span>
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Earned {formatRelative(entry.createdAt)}</span>
                    {entry.expiresAt ? (
                      <span>Expires {formatRelative(entry.expiresAt)}</span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={MEMBER_PRODUCTS_PATH}
          className="text-sm text-sky-600 hover:underline"
        >
          Manage badges →
        </Link>
      </CardFooter>
    </Card>
  )
}

async function RecentLaunchesCard({
  recentProductsPromise,
}: {
  recentProductsPromise: ReturnType<typeof getUserProducts>
}) {
  const recentProducts = await recentProductsPromise

  return (
    <Card className="border-slate-200/70 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Recent launches</CardTitle>
        <CardDescription>
          Products launched within the last period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No launches in this window.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentProducts.slice(0, 4).map((product) => (
              <li key={product.id} className="space-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={memberProductPath(product.id)}
                    className="flex-1 truncate font-medium text-slate-900 hover:underline"
                  >
                    {product.name}
                  </Link>
                  <Badge
                    variant={
                      product.verification?.isVerified ? "success" : "outline"
                    }
                  >
                    {product.verification?.isVerified ? "Verified" : "Verify"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatRelative(product.createdAt)}</span>
                  <span>
                    {formatNumber(product.analytics?.clicks ?? 0)} clicks
                  </span>
                  <span>
                    {formatNumber(product.analytics?.upvotes ?? 0)} upvotes
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={MEMBER_PRODUCTS_PATH}
          className="text-sm text-sky-600 hover:underline"
        >
          View all products →
        </Link>
      </CardFooter>
    </Card>
  )
}

function OverviewZeroState() {
  return (
    <div className="relative flex flex-col items-center justify-center rounded-3xl border border-[color:var(--brand-1)/0.25] bg-background/92 px-6 py-16 text-center shadow-[0_38px_100px_-72px_rgba(7,78,134,0.6)] backdrop-blur">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,var(--brand-1)/0.18,transparent_60%)]"
      />
      <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm">
        Member Command Deck
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Welcome aboard</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Add your first product to unlock analytics, performance insights, and
        action prompts tailored to your launches.
      </p>
      <CreateButton asChild className="mt-8" label="Add product">
        <Link href={MEMBER_PRODUCTS_ADD_PATH}>Add product</Link>
      </CreateButton>
    </div>
  )
}

function TaskCollection({
  title,
  count,
  description,
  items,
  href,
}: {
  title: string
  count: number
  description: string
  items: SimpleTaskItem[]
  href: string
}) {
  const hasItems = count > 0 && items.length > 0

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-slate-200/70 bg-white/85 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.28em]"
        >
          {formatNumber(count)}
        </Badge>
      </div>
      {hasItems ? (
        <>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {items.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-slate-900">{item.name}</span>
                {item.timestamp ? (
                  <span>{formatRelative(item.timestamp)}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {items.length > 3 ? (
            <p className="text-[11px] italic text-muted-foreground">
              +{formatNumber(items.length - 3)} more queued
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          All clear for now—nothing urgent here.
        </p>
      )}
      <div className="mt-auto flex justify-end">
        <Link
          href={href}
          className="text-xs font-semibold text-[color:var(--brand-1)] hover:underline"
        >
          Go to list →
        </Link>
      </div>
    </div>
  )
}

function buildHighlight({
  stats,
  unverified,
  drafts,
  needsMedia,
  expiringBadges,
  topByClicks,
  days,
}: {
  stats: DashboardStats
  unverified: UnverifiedProduct[]
  drafts: DraftProduct[]
  needsMedia: NeedsMediaProduct[]
  expiringBadges: ExpiringBadge[]
  topByClicks: Awaited<ReturnType<typeof getTopProductsByMetric>>
  days: number
}): Highlight {
  if (stats.unverifiedCount > 0) {
    const count = stats.unverifiedCount
    return {
      title: "Verify your domains",
      body: `You have ${formatNumber(count)} ${pluralize(count, "product")} waiting on domain verification. Keeping them verified boosts trust signals across listings.`,
      href: memberProductsVerificationPath("unverified"),
      cta: "Review domains",
    }
  }
  if (stats.draftsCount > 0) {
    const count = stats.draftsCount
    return {
      title: "Drafts ready to publish",
      body: `${count === 1 ? "One" : formatNumber(count)} draft ${pluralize(count, "update")} to polish and share. A quick review keeps momentum.`,
      href: memberProductsStatusPath("draft"),
      cta: "Finish drafts",
    }
  }
  if (needsMedia.length > 0) {
    const count = needsMedia.length
    return {
      title: "Add fresh visuals",
      body: `${formatNumber(count)} ${pluralize(count, "product")} could use updated screenshots to lift conversions.`,
      href: MEMBER_PRODUCTS_PATH,
      cta: "Update media",
    }
  }
  if (expiringBadges.length > 0) {
    const count = expiringBadges.length
    return {
      title: "Renew expiring badges",
      body: `${formatNumber(count)} earned ${pluralize(count, "perk")} will lapse soon—refresh them to keep visibility high.`,
      href: MEMBER_PRODUCTS_PATH,
      cta: "Review badges",
    }
  }
  const topClickProduct = topByClicks[0]
  if (topClickProduct) {
    const clicks = formatNumber(topClickProduct.analytics?.clicks ?? 0)
    return {
      title: `${topClickProduct.name} is drawing eyes`,
      body: `It has collected ${clicks} total clicks so far. Consider sharing an update while the spotlight is on.`,
      href: memberProductPath(topClickProduct.id),
      cta: "Open product",
    }
  }

  return {
    title: "All clear",
    body: `Nothing urgent on deck. Keep exploring new launches or sizing up your metrics over the last ${days} days.`,
  }
}

function OverviewPageSkeleton() {
  return (
    <div className="space-y-10">
      <HeroSectionSkeleton />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <QuickTasksSkeleton />
          <MomentumSectionSkeleton />
          <SignalsSectionSkeleton />
        </div>
        <aside className="space-y-6">
          <HighlightCardSkeleton />
          <RewardsCardSkeleton />
          <FreshBadgesCardSkeleton />
          <RecentLaunchesCardSkeleton />
        </aside>
      </div>
    </div>
  )
}

function HeroSectionSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.28] bg-gradient-to-br from-white/95 via-white/88 to-sky-50/70 p-6 shadow-[0_32px_80px_-72px_rgba(11,79,135,0.75)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { width: "10rem", withIcon: true },
              { width: "4.5rem" },
              { width: "6rem" },
            ].map((badge, index) => (
              <BadgeSkeleton
                // eslint-disable-next-line react/no-array-index-key -- decorative
                key={index}
                variant="outline"
                labelWidth={badge.width}
                leadingIcon={badge.withIcon}
                className="h-7"
              />
            ))}
          </div>
          <div className="space-y-3">
            <HeadingSkeleton lines={2} centered={false} />
            <Skeleton
              className="h-3 w-96 max-w-full rounded-full"
              tone="muted"
            />
            <Skeleton
              className="h-3 w-80 max-w-full rounded-full"
              tone="muted"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonSkeleton size="sm" labelWidth="7rem" />
            <ButtonSkeleton size="sm" variant="outline" labelWidth="8rem" />
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:items-end">
          <ButtonSkeleton
            size="sm"
            variant="outline"
            labelWidth="6rem"
            className="w-40 justify-center"
          />
          <div className="grid w-full gap-3 sm:min-w-[240px] sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <CardSkeleton
                // eslint-disable-next-line react/no-array-index-key -- decorative
                key={index}
                tone="soft"
                radius="md"
                lines={1}
                showHeader={false}
                className="gap-3 border-[color:var(--brand-1)/0.18] bg-white/92 p-4"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function QuickTasksSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <CardSkeleton
          // eslint-disable-next-line react/no-array-index-key -- decorative
          key={index}
          tone="soft"
          radius="lg"
          lines={4}
          showFooter={false}
          actionWidth="5rem"
          className="border-slate-200/70 bg-white/90"
        />
      ))}
    </section>
  )
}

function MomentumSectionSkeleton() {
  return (
    <section className="space-y-4">
      <HeadingSkeleton lines={1} centered={false} />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <CardSkeleton
            // eslint-disable-next-line react/no-array-index-key -- decorative
            key={index}
            tone="soft"
            radius="lg"
            lines={4}
            className="border-slate-200/70 bg-white/95"
          />
        ))}
      </div>
    </section>
  )
}

function SignalsSectionSkeleton() {
  return (
    <section className="space-y-4">
      <HeadingSkeleton lines={1} centered={false} />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <CardSkeleton
            // eslint-disable-next-line react/no-array-index-key -- decorative
            key={index}
            tone="soft"
            radius="lg"
            lines={5}
            className="border-slate-200/70 bg-white/95"
          />
        ))}
      </div>
    </section>
  )
}

function HighlightCardSkeleton() {
  return (
    <CardSkeleton
      tone="soft"
      radius="lg"
      lines={3}
      showFooter
      actionWidth="6rem"
      className="border-slate-200/70 bg-white/95 shadow-md"
    />
  )
}

function RewardsCardSkeleton() {
  return (
    <CardSkeleton
      tone="soft"
      radius="lg"
      lines={4}
      showFooter
      actionWidth="7rem"
      className="border-slate-200/70 bg-white/95 shadow-sm"
    />
  )
}

function FreshBadgesCardSkeleton() {
  return (
    <CardSkeleton
      tone="soft"
      radius="lg"
      lines={4}
      showFooter
      actionWidth="6rem"
      className="border-slate-200/70 bg-white/95 shadow-sm"
    />
  )
}

function RecentLaunchesCardSkeleton() {
  return (
    <CardSkeleton
      tone="soft"
      radius="lg"
      lines={4}
      showFooter
      actionWidth="7rem"
      className="border-slate-200/70 bg-white/95 shadow-sm"
    />
  )
}

function rangeToDays(range?: string): number {
  switch (range) {
    case "30d":
      return 30
    case "14d":
      return 14
    case "90d":
      return 90
    case "7d":
    default:
      return 7
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

function formatRelative(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function rangeDescriptorForDays(days: number) {
  switch (days) {
    case 7:
      return "over the past 7 days"
    case 14:
      return "across the last 14 days"
    default:
      return `across the last ${days} days`
  }
}

function renderActivityLabel(activity: ActivityItem) {
  switch (activity.type) {
    case "product_created":
      return "Product created"
    case "product_updated":
      return "Product updated"
    case "domain_verified":
      return "Domain verified"
    case "badge_assigned":
      return activity.meta?.badge
        ? `Badge earned: ${activity.meta.badge}`
        : "Badge assigned"
    case "product_upvoted":
      return "Received an upvote"
    default:
      return "Activity"
  }
}
