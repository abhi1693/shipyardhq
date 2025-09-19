import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { formatDistanceToNow } from "date-fns"
import { StatCard } from "@/components/molecules/StatCard"
import Link from "next/link"
import {
  getUserDashboardStats,
  getUserProducts,
  getUnverifiedProducts,
  getUserDrafts,
  getTopProductsByMetric,
  getExpiringBadges,
  getProductsNeedingMedia,
  getRecentActivity,
  getProductHealthSummary,
} from "@/actions/member/overview/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import { formatBoolean, linkify, placeholder } from "@/lib/ui/formatters"
import { Button } from "@/components/atoms/button"
import AddButton from "@/components/molecules/AddButton"
import RangeSelector from "@/components/molecules/RangeSelector"
import { VerifyDomainButton } from "@/components/molecules/VerifyDomainButton"
import { Badge } from "@/components/atoms/badge"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import {
  IconTrendingUp,
  IconThumbUp,
  IconRocket,
  IconBadge,
  IconPencil,
  IconShieldCheck,
  IconPhoto,
} from "@tabler/icons-react"

export const revalidate = 60

type SearchParams = { range?: string }

function rangeToDays(range?: string): number {
  switch (range) {
    case "30d":
      return 30
    case "90d":
      return 90
    case "7d":
    default:
      return 7
  }
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
    products,
    unverified,
    drafts,
    topByClicks,
    topByUpvotes,
    expiringBadges,
    needsMedia,
    activity,
    health,
  ] = await Promise.all([
    getUserDashboardStats(days),
    getUserProducts(5, days),
    getUnverifiedProducts(3),
    getUserDrafts(3),
    getTopProductsByMetric("clicks", 3, days),
    getTopProductsByMetric("upvotes", 3, days),
    getExpiringBadges(5, 14),
    getProductsNeedingMedia(2, 5),
    getRecentActivity(days, 10),
    getProductHealthSummary(days),
  ])

  // If user has no products yet, show a crisp, focused welcome prompt
  if (stats.totalProducts === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/90 px-6 py-16 text-center shadow-[0px_30px_85px_-65px_rgba(7,78,134,0.55)] backdrop-blur">
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
          Dock your first product to unlock analytics, health insights, and
          action prompts tailored to your launches.
        </p>
        <Link href="/member/products/add" className="mt-8">
          <AddButton label="Add Product" />
        </Link>
      </div>
    )
  }

  const quickFilters = [
    {
      label: "All Products",
      href: "/member/products",
      count: stats.totalProducts,
    },
    {
      label: "Drafts",
      href: "/member/products?status=draft",
      count: stats.draftsCount,
    },
    {
      label: "Unverified Domains",
      href: "/member/products?verification=unverified",
      count: stats.unverifiedCount,
    },
  ]

  const heroHighlights = [
    {
      label: "Drafts Waiting",
      value: stats.draftsCount,
      hint:
        stats.draftsCount === 1
          ? "Draft ready to publish"
          : "Drafts ready to publish",
      href: stats.draftsCount > 0 ? "/member/products?status=draft" : undefined,
      icon: <IconPencil className="h-4 w-4" />,
    },
    {
      label: "Verify Domains",
      value: stats.unverifiedCount,
      hint: "Boost trust signals",
      href:
        stats.unverifiedCount > 0
          ? "/member/products?verification=unverified"
          : undefined,
      icon: <IconShieldCheck className="h-4 w-4" />,
    },
    {
      label: "Expiring Badges",
      value: expiringBadges.length,
      hint: "Within 14 days",
      href: expiringBadges.length > 0 ? "/member/products" : undefined,
      icon: <IconBadge className="h-4 w-4" />,
    },
    {
      label: "Add Screenshots",
      value: needsMedia.length,
      hint: "Keep visuals fresh",
      href: needsMedia.length > 0 ? "/member/products" : undefined,
      icon: <IconPhoto className="h-4 w-4" />,
    },
  ]

  const glassCardClass =
    "relative overflow-hidden border border-[color:var(--brand-1)/0.18] bg-background/90 shadow-[0px_28px_75px_-55px_rgba(7,78,134,0.55)] backdrop-blur"

  return (
    <div className="space-y-12">
      <section className={`${glassCardClass} rounded-3xl px-6 py-8`}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,var(--brand-1)/0.2,transparent_55%)]"
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-[color:var(--brand-2)] shadow-sm">
              Member Command Deck
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Overview
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Monitor performance across the last {days} days, keep products
                polished, and close out the tasks that move your launch forward.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map(({ label, href, count }) => (
                <Link
                  key={label}
                  href={href}
                  className="group inline-flex items-center"
                >
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-2 rounded-full border-[color:var(--brand-1)/0.28] bg-background/75 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)] shadow-[0_15px_45px_-35px_rgba(7,78,134,0.6)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-[color:var(--brand-1)/0.4] group-hover:bg-background/90"
                  >
                    {label}
                    <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border border-[color:var(--brand-1)/0.28] bg-background/85 text-[10px] font-medium text-[color:var(--brand-1)] transition group-hover:border-[color:var(--brand-1)/0.4]">
                      {count}
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:max-w-sm lg:max-w-xs">
            <RangeSelector />
            <div className="flex flex-wrap gap-2">
              <Link href="/member/products/add">
                <AddButton size="sm" label="Add Product" />
              </Link>
              {stats.draftsCount > 0 && (
                <Link href="/member/products?status=draft">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[color:var(--brand-1)/0.35] text-[color:var(--brand-1)] hover:bg-[color:var(--brand-1)/0.08]"
                  >
                    <IconPencil className="mr-2 h-4 w-4" />
                    Finish Drafts ({stats.draftsCount})
                  </Button>
                </Link>
              )}
              {stats.unverifiedCount > 0 && (
                <Link href="/member/products?verification=unverified">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[color:var(--brand-2)/0.35] text-[color:var(--brand-2)] hover:bg-[color:var(--brand-2)/0.08]"
                  >
                    <IconShieldCheck className="mr-2 h-4 w-4" />
                    Verify Domains ({stats.unverifiedCount})
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {heroHighlights.map(({ label, value, hint, href, icon }) => {
            const content = (
              <div className="relative flex h-full flex-col justify-between gap-3 rounded-2xl border border-[color:var(--brand-1)/0.18] bg-background/80 px-4 py-4 shadow-[0px_24px_65px_-50px_rgba(7,78,134,0.5)] transition duration-200 hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                  {icon}
                  {label}
                </div>
                <div className="text-3xl font-semibold text-foreground">
                  {value}
                </div>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            )
            return href ? (
              <Link key={label} href={href} className="group">
                {content}
              </Link>
            ) : (
              <div key={label}>{content}</div>
            )
          })}
        </div>
      </section>

      <section className="space-y-6">
        <PageSectionHeader
          eyebrow="Performance"
          title="Snapshot"
          subtitle={`Engagement and reach over the last ${days} days.`}
          underline={false}
        />
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Products Created"
            value={stats.totalProducts}
            subheading={`+${stats.productsInRange} in last ${days}d`}
            icon={<IconRocket className="h-6 w-6" />}
          />
          <StatCard
            title="Verified Domains"
            value={stats.verifiedDomains}
            subheading={`${stats.verifiedRate}% verified`}
            badge={`${stats.verifiedRate}%`}
            trend="up"
            icon={<IconShieldCheck className="h-6 w-6" />}
          />
          <StatCard
            title="Total Clicks"
            value={stats.totalClicks}
            subheading="All-time engagement"
            icon={<IconTrendingUp className="h-6 w-6" />}
          />
          <StatCard
            title="Upvotes Received"
            value={stats.totalUpvotes}
            subheading="Community signals"
            icon={<IconThumbUp className="h-6 w-6" />}
          />
        </div>
      </section>

      <section className="space-y-6">
        <PageSectionHeader
          eyebrow="Quality"
          title="Product Health & Top Movers"
          subtitle="Keep every listing mission-ready and see which products resonate most."
          underline={false}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className={`${glassCardClass} lg:col-span-1`}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--brand-1)/0.18,transparent_65%)]"
            />
            <CardHeader>
              <CardTitle>Product Health</CardTitle>
              <CardDescription>
                Average completeness across your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div className="text-sm text-muted-foreground">
                  Average score
                </div>
                <div className="text-3xl font-semibold text-foreground">
                  {health.averageScore}%
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--brand-1)/0.12]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                  style={{
                    width: `${Math.max(0, Math.min(100, health.averageScore))}%`,
                  }}
                />
              </div>
              {health.suggestions?.length ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Top fixes</div>
                  <ul className="space-y-2 text-sm">
                    {health.suggestions.slice(0, 3).map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--brand-1)/0.15] bg-background/70 px-3 py-2 text-left transition hover:border-[color:var(--brand-1)/0.3]"
                      >
                        <Link
                          href={s.href || "/member/products"}
                          className="text-primary hover:underline"
                        >
                          {s.label}
                        </Link>
                        <Badge variant="outline">{s.count}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className={`${glassCardClass} lg:col-span-2`}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--brand-2)/0.14,transparent_70%)]"
            />
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Performance in last {days} days</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-1)]">
                  By Clicks
                </div>
                {topByClicks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data</div>
                ) : (
                  <ul className="space-y-3">
                    {topByClicks.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--brand-1)/0.16] bg-background/80 px-3 py-2 transition hover:border-[color:var(--brand-1)/0.3]"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <IconTrendingUp className="h-4 w-4 text-[color:var(--brand-1)]" />
                          <span className="truncate">
                            {linkify({
                              label: p.name,
                              href: `/member/products/${p.slug}`,
                            })}
                          </span>
                        </span>
                        <Badge variant="secondary">
                          {p.analytics?.clicks ?? 0}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-2)]">
                  By Upvotes
                </div>
                {topByUpvotes.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data</div>
                ) : (
                  <ul className="space-y-3">
                    {topByUpvotes.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--brand-1)/0.16] bg-background/80 px-3 py-2 transition hover:border-[color:var(--brand-1)/0.3]"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <IconThumbUp className="h-4 w-4 text-[color:var(--brand-2)]" />
                          <span className="truncate">
                            {linkify({
                              label: p.name,
                              href: `/member/products/${p.slug}`,
                            })}
                          </span>
                        </span>
                        <Badge variant="secondary">
                          {p.analytics?.upvotes ?? 0}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <PageSectionHeader
          eyebrow="Action Center"
          title="Keep Momentum"
          subtitle="Resolve outstanding tasks to strengthen discovery and conversion."
          underline={false}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Unverified Domains</CardTitle>
              <CardDescription>Verify to unlock trust</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {unverified.length === 0 ? (
                <div className="text-sm text-muted-foreground">All set 🎉</div>
              ) : (
                unverified.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[color:var(--brand-1)/0.15] bg-background/75 p-3 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {linkify({
                        label: p.name,
                        href: `/member/products/${p.slug}`,
                      })}
                      <Link
                        href={`/member/products/${p.slug}`}
                        className="text-xs text-[color:var(--brand-1)] hover:underline"
                      >
                        View
                      </Link>
                    </div>
                    <div className="mt-1 break-all text-xs text-muted-foreground">
                      TXT: {p.verification?.verificationTxt}
                    </div>
                    <div className="mt-3">
                      <VerifyDomainButton productId={p.id} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Drafts</CardTitle>
              <CardDescription>Finish and launch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No drafts</div>
              ) : (
                drafts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--brand-1)/0.15] bg-background/75 px-3 py-2 text-sm"
                  >
                    {linkify({
                      label: d.name,
                      href: `/member/products/${d.slug}`,
                    })}
                    <Link
                      href={`/member/products/${d.slug}/edit`}
                      className="text-xs text-[color:var(--brand-1)] hover:underline"
                    >
                      Resume
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
            {stats.draftsCount > 0 && (
              <CardFooter>
                {linkify({
                  label: `View all drafts →`,
                  href: "/member/products?status=draft",
                })}
              </CardFooter>
            )}
          </Card>

          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Add Screenshots</CardTitle>
              <CardDescription>Improve conversion with visuals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {needsMedia.length === 0 ? (
                <div className="text-sm text-muted-foreground">Looks good</div>
              ) : (
                needsMedia.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--brand-1)/0.15] bg-background/75 px-3 py-2 text-sm"
                  >
                    {linkify({
                      label: p.name,
                      href: `/member/products/${p.slug}`,
                    })}
                    <Link
                      href={`/member/products/${p.slug}`}
                      className="text-xs text-[color:var(--brand-1)] hover:underline"
                    >
                      ↗ Open
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Expiring Badges</CardTitle>
              <CardDescription>Keep momentum up</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {expiringBadges.length === 0 ? (
                <div className="text-sm text-muted-foreground">None</div>
              ) : (
                expiringBadges.map((b) => {
                  const diffDays = Math.max(
                    0,
                    Math.ceil(
                      ((b.expiresAt
                        ? new Date(b.expiresAt as any).getTime()
                        : Date.now()) -
                        Date.now()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  )
                  const variant =
                    diffDays <= 3
                      ? "destructive"
                      : diffDays <= 7
                        ? "secondary"
                        : "outline"
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--brand-1)/0.15] bg-background/75 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {b.product.name} — {b.badge}
                      </span>
                      <Badge variant={variant as any}>{diffDays}d</Badge>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <PageSectionHeader
          eyebrow="Latest Updates"
          title="Recent Products & Activity"
          subtitle="Track new launches and the signals they generate."
          underline={false}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Recent Products</CardTitle>
              <CardDescription>Your latest 5 submissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.length === 0 ? (
                <EmptyState
                  title="No products yet"
                  description="Dock your first product to get visibility."
                  actionLabel="Add Product"
                  actionHref="/member/products/add"
                />
              ) : (
                products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[color:var(--brand-1)/0.16] bg-background/80 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {linkify({
                        label: p.name,
                        href: `/member/products/${p.slug}`,
                      })}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(p.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {p?.verification
                        ? formatBoolean(
                            p.verification.isVerified,
                            "Verified",
                            "Not Verified",
                          )
                        : placeholder()}
                      <span>Clicks: {p.analytics?.clicks || 0}</span>
                      <span>Upvotes: {p.analytics?.upvotes || 0}</span>
                      <Link
                        href={`/member/products/${p.slug}/edit`}
                        className="inline-flex items-center gap-1 text-[color:var(--brand-1)] hover:underline"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            {products.length > 0 && (
              <CardFooter>
                {linkify({
                  label: `View all your products →`,
                  href: "/member/products",
                })}
              </CardFooter>
            )}
          </Card>

          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No recent activity
                </div>
              ) : (
                <ul className="space-y-3 text-sm">
                  {activity.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--brand-1)/0.16] bg-background/75 px-3 py-3"
                    >
                      <div className="flex items-start gap-3 text-left">
                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--brand-1)/0.18] bg-background/80 text-[color:var(--brand-1)]">
                          {a.type === "product_created" && (
                            <IconRocket className="h-4 w-4" />
                          )}
                          {a.type === "product_updated" && (
                            <IconPencil className="h-4 w-4" />
                          )}
                          {a.type === "domain_verified" && (
                            <IconShieldCheck className="h-4 w-4" />
                          )}
                          {a.type === "badge_assigned" && (
                            <IconBadge className="h-4 w-4" />
                          )}
                          {a.type === "product_upvoted" && (
                            <IconThumbUp className="h-4 w-4" />
                          )}
                        </span>
                        <div className="space-y-1">
                          {a.type === "product_created" && (
                            <span>
                              Created{" "}
                              {linkify({
                                label: a.product.name,
                                href: `/member/products/${a.product.slug}`,
                              })}
                            </span>
                          )}
                          {a.type === "product_updated" && (
                            <span>
                              Updated{" "}
                              {linkify({
                                label: a.product.name,
                                href: `/member/products/${a.product.slug}`,
                              })}
                            </span>
                          )}
                          {a.type === "domain_verified" && (
                            <span>
                              Verified domain for{" "}
                              {linkify({
                                label: a.product.name,
                                href: `/member/products/${a.product.slug}`,
                              })}
                            </span>
                          )}
                          {a.meta?.badge && a.type === "badge_assigned" && (
                            <span>
                              Badge “{a.meta.badge}” added to{" "}
                              {linkify({
                                label: a.product.name,
                                href: `/member/products/${a.product.slug}`,
                              })}
                            </span>
                          )}
                          {a.type === "product_upvoted" && (
                            <span>
                              Upvote received on{" "}
                              {linkify({
                                label: a.product.name,
                                href: `/member/products/${a.product.slug}`,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(a.ts)}
                      </span>
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
