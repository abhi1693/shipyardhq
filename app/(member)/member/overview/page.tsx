import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

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
import {
  MEMBER_PRODUCTS_ADD_PATH,
  MEMBER_PRODUCTS_PATH,
  memberProductPath,
  memberProductsStatusPath,
  memberProductsVerificationPath,
} from "@/lib/routes"
import { BADGE_OPTIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { currentUser } from "@clerk/nextjs/server"

export const revalidate = 60

type SearchParams = { range?: string }

type DraftProduct = Awaited<ReturnType<typeof getUserDrafts>>[number]
type ActivityItem = Awaited<ReturnType<typeof getRecentActivity>>[number]
type ExpiringBadge = Awaited<ReturnType<typeof getExpiringBadges>>[number]
type NeedsMediaProduct = Awaited<
  ReturnType<typeof getProductsNeedingMedia>
>[number]

type UnverifiedProduct = Awaited<
  ReturnType<typeof getUnverifiedProducts>
>[number]

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

function TrendBadge({
  current,
  previous,
}: {
  current?: number
  previous?: number
}) {
  if (typeof current !== "number" || typeof previous !== "number") {
    return null
  }

  const delta = current - previous
  if (delta === 0) {
    return (
      <span className="text-xs text-muted-foreground">No change vs prior</span>
    )
  }

  const arrow = delta > 0 ? "▲" : "▼"
  const tone = delta > 0 ? "text-emerald-600" : "text-rose-600"
  const percent = previous === 0 ? null : (Math.abs(delta) / previous) * 100
  const percentText =
    percent !== null
      ? `${delta > 0 ? "+" : "-"}${percent.toFixed(1)}%`
      : undefined

  return (
    <span className={cn("text-xs font-medium tabular-nums", tone)}>
      {arrow} {formatNumber(Math.abs(delta))}
      {percentText ? ` (${percentText})` : ""} vs prior
    </span>
  )
}

function MetricTile({
  title,
  value,
  current,
  previous,
  helper,
  href,
}: {
  title: string
  value: string
  current?: number
  previous?: number
  helper?: string
  href?: string
}) {
  const card = (
    <Card className="h-full border-slate-200/70 bg-white/90 shadow-sm transition hover:border-sky-200/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="text-xl font-semibold text-slate-900">{value}</div>
        {typeof current === "number" && typeof previous === "number" ? (
          <TrendBadge current={current} previous={previous} />
        ) : null}
        {helper ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {helper}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link
      href={href}
      className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
    >
      {card}
    </Link>
  ) : (
    card
  )
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const days = rangeToDays(sp?.range)
  const [
    stats,
    recentProducts,
    unverified,
    drafts,
    topByClicks,
    topByUpvotes,
    expiringBadges,
    freshBadges,
    needsMedia,
    activity,
    health,
    user,
  ] = await Promise.all([
    getUserDashboardStats(days),
    getUserProducts(6, days),
    getUnverifiedProducts(3),
    getUserDrafts(3),
    getTopProductsByMetric("clicks", 3, days),
    getTopProductsByMetric("upvotes", 3, days),
    getExpiringBadges(4, 14),
    getNewBadgeProducts(18),
    getProductsNeedingMedia(2, 4),
    getRecentActivity(days, 8),
    getProductHealthSummary(days),
    currentUser(),
  ])

  if (stats.totalProducts === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-3xl border border-[color:var(--brand-1)/0.25] bg-background/92 px-6 py-16 text-center shadow-[0_38px_100px_-72px_rgba(7,78,134,0.6)] backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,var(--brand-1)/0.18,transparent_60%)]"
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm">
          Member Command Deck
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Welcome aboard
        </h1>
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

  const verificationProgress = Math.max(0, Math.min(stats.verifiedRate, 100))

  const metrics = [
    {
      title: `New products (${days}d)`,
      value: formatNumber(stats.productsInRange),
      helper: `${formatNumber(stats.totalProducts)} live products`,
      href: MEMBER_PRODUCTS_PATH,
    },
    {
      title: "Drafts waiting",
      value: formatNumber(stats.draftsCount),
      helper: "Finish polishing and publish",
      href: memberProductsStatusPath("draft"),
    },
    {
      title: "Verified domains",
      value: `${stats.verifiedRate}%`,
      helper: `${formatNumber(stats.verifiedDomains)} verified`,
      href: stats.unverifiedCount
        ? memberProductsVerificationPath("unverified")
        : undefined,
    },
    {
      title: "Total clicks",
      value: formatNumber(stats.totalClicks),
      helper: "Lifetime engagement",
      href: MEMBER_PRODUCTS_PATH,
    },
    {
      title: "Total upvotes",
      value: formatNumber(stats.totalUpvotes),
      helper: "Community support",
      href: MEMBER_PRODUCTS_PATH,
    },
    {
      title: "Unverified products",
      value: formatNumber(stats.unverifiedCount),
      helper: "Securing trust signals",
      href: stats.unverifiedCount
        ? memberProductsVerificationPath("unverified")
        : undefined,
    },
  ]

  type SimpleTaskItem = { id: string; name: string; timestamp?: Date }

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

  const quickTasks = [
    {
      title: "Verify domains",
      count: stats.unverifiedCount,
      description: "Keep trust signals strong by completing TXT verification.",
      href: memberProductsVerificationPath("unverified"),
      items: taskItems.unverified,
    },
    {
      title: "Finish drafts",
      count: stats.draftsCount,
      description: "Polish copy and screenshots before launch.",
      href: memberProductsStatusPath("draft"),
      items: taskItems.drafts,
    },
    {
      title: "Add visuals",
      count: needsMedia.length,
      description: "Fresh screenshots help conversions.",
      href: MEMBER_PRODUCTS_PATH,
      items: taskItems.media,
    },
    {
      title: "Expiring badges",
      count: expiringBadges.length,
      description: "Renew perks before they lapse.",
      href: MEMBER_PRODUCTS_PATH,
      items: taskItems.badges,
    },
  ]

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  const emailHandle = primaryEmail ? primaryEmail.split("@")[0] : null
  const shortName =
    user?.firstName ?? user?.username ?? emailHandle ?? "Shipmate"
  const displayName = user?.fullName ?? shortName
  const planLabel = stats.plan?.name ? `${stats.plan.name} plan` : null

  const topClickProduct = topByClicks[0]

  const highlight = (() => {
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
  })()

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

  const rangeLabel = (sp?.range ?? "7d").toUpperCase()
  const rangeDescriptor =
    days === 7
      ? "over the past 7 days"
      : days === 14
        ? "across the last 14 days"
        : `across the last ${days} days`

  const lifetimeSummary =
    stats.totalClicks > 0 || stats.totalUpvotes > 0
      ? `Your launches have gathered ${formatNumber(stats.totalClicks)} clicks and ${formatNumber(stats.totalUpvotes)} upvotes so far.`
      : "Invite your audience to explore your listings to start gathering clicks and upvotes."

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
              <span className="rounded-full border border-[color:var(--brand-1)/0.35] px-3 py-1 text-[10px] text-[color:var(--brand-1)]">
                Member Command Deck
              </span>
              <span className="rounded-full border border-[color:var(--brand-1)/0.22] px-3 py-1 text-[10px] text-[color:var(--brand-1)]/80">
                {rangeLabel}
              </span>
              {planLabel ? (
                <span className="rounded-full border border-[color:var(--brand-1)/0.22] px-3 py-1 text-[10px] text-[color:var(--brand-1)]/80">
                  {planLabel}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back, {displayName}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Here’s what’s happened {rangeDescriptor}. {lifetimeSummary}
            </p>
            <div className="rounded-xl border border-[color:var(--brand-1)/0.18] bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)]/80">
                Next best step
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {highlight.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {highlight.body}
              </p>
              {highlight.href ? (
                <Link
                  href={highlight.href}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--brand-1)] hover:underline"
                >
                  {highlight.cta ?? "Open"}
                  <span aria-hidden>→</span>
                </Link>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <RangeSelector />
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[120px] rounded-lg border border-[color:var(--brand-1)/0.18] bg-white/90 px-3 py-2 text-left shadow-sm"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
                    {stat.label}
                  </div>
                  <div className="text-lg font-semibold text-slate-900">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            At a glance
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <MetricTile key={metric.title} {...metric} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Operations
          </h2>
          <CreateButton asChild size="sm" label="Add product">
            <Link href={MEMBER_PRODUCTS_ADD_PATH}>Add product</Link>
          </CreateButton>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick shortcuts</CardTitle>
              <CardDescription>
                Jump directly to the work that matters.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={MEMBER_PRODUCTS_PATH}>View products</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={memberProductsStatusPath("draft")}>
                  Manage drafts
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={memberProductsVerificationPath("unverified")}>
                  Verify domains
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Verification progress</CardTitle>
              <CardDescription>
                {formatNumber(stats.verifiedDomains)} verified of{" "}
                {formatNumber(stats.totalProducts)}
                products.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.unverifiedCount > 0
                  ? `${formatNumber(stats.unverifiedCount)} product(s) still need domain verification.`
                  : "Everything verified — nice work."}
              </p>
              <Link
                href={memberProductsVerificationPath("unverified")}
                className="text-xs font-medium text-sky-600 hover:underline"
              >
                Review unverified products →
              </Link>
            </CardContent>
          </Card>

          {quickTasks.map((task) => (
            <Card
              key={task.title}
              className="border-slate-200/70 bg-white/90 shadow-sm"
            >
              <CardHeader>
                <CardTitle className="text-base">
                  {task.title}
                  <span className="ml-2 text-xs font-medium text-muted-foreground">
                    {formatNumber(task.count)}
                  </span>
                </CardTitle>
                <CardDescription>{task.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {task.count === 0 ? (
                  <p className="text-muted-foreground">All clear for now.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {task.items?.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate text-slate-900">
                          {item.name}
                        </span>
                        {item.timestamp ? (
                          <span className="text-xs text-muted-foreground">
                            {formatRelative(item.timestamp)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <CardFooter>
                <Link
                  href={task.href}
                  className="text-sm text-sky-600 hover:underline"
                >
                  Go to list →
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Top performers
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
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

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
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

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Performance pulse
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
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

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent launches</CardTitle>
              <CardDescription>
                Products launched within the last {days} days.
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
                            product.verification?.isVerified
                              ? "success"
                              : "outline"
                          }
                        >
                          {product.verification?.isVerified
                            ? "Verified"
                            : "Verify"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatRelative(product.createdAt)}</span>
                        <span>
                          {formatNumber(product.analytics?.clicks ?? 0)} clicks
                        </span>
                        <span>
                          {formatNumber(product.analytics?.upvotes ?? 0)}{" "}
                          upvotes
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

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
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

          <Card className="border-slate-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Product health</CardTitle>
              <CardDescription>
                Average completeness across your portfolio:{" "}
                {health.averageScore}%
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
    </div>
  )
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
