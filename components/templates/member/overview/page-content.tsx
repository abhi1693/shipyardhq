import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { auth, currentUser } from "@clerk/nextjs/server"
import { formatDistanceToNow } from "date-fns"
import {
  Award,
  ExternalLink,
  Eye,
  Flame,
  Package,
  Rocket,
  ThumbsUp,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Skeleton } from "@/components/atoms/skeleton"
import { getMemberTrafficOverview } from "@/actions/member/overview/actions"
import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import ProductDraftStartButton from "@/components/pages/products/ProductDraftStartButton"
import { MemberAnalyticsCharts } from "@/components/templates/member/overview/analytics-charts"
import prisma from "@/lib/prisma"
import { isOptimizedImageSrc } from "@/lib/images/sources"
import { cn } from "@/lib/utils"
import {
  MEMBER_PRODUCTS_PATH,
  MEMBER_REWARDS_PATH,
  memberProductPath,
} from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"

const AGGREGATION_WINDOW_DAYS = 7
const DODO_GREEN = "#c0ff00"

type StatDefinition = {
  id: string
  label: string
  value: number
  icon: LucideIcon
  tint: "blue" | "green" | "orange"
  meta: string
}

type ProductSnapshot = {
  id: string
  name: string
  slug: string
  logo: string
  status: string
  updatedAt: Date
  publishedAt: Date | null
}

type RewardActivity = {
  id: string
  title: string
  amount: number
  createdAt: Date
}

type MemberDashboardSnapshot = {
  products: ProductSnapshot[]
  rewardBalance: {
    balance: number
    lifetimeEarned: number
    currentStreakCount: number
  }
  rewardActivity: RewardActivity[]
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

export async function MemberOverviewPageContent() {
  const user = await currentUser()

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null
  const emailHandle = primaryEmail ? primaryEmail.split("@")[0] : null
  const displayName =
    user?.firstName ?? user?.username ?? emailHandle ?? "Shipmate"

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
            Hi {displayName}, welcome back{" "}
            <span role="img" aria-label="Waving hand">
              👋
            </span>
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Here&apos;s what&apos;s happening with your {BRAND_NAME} launches
            today.
          </p>
        </div>
        <ProductDraftStartButton
          mode="member"
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <Rocket className="h-4 w-4" aria-hidden />
          Launch new project
        </ProductDraftStartButton>
      </header>

      <Suspense fallback={<AnalyticsSectionSkeleton />}>
        <MemberOverviewDashboard />
      </Suspense>
    </div>
  )
}

async function MemberOverviewDashboard() {
  const [summary, snapshot] = await Promise.all([
    getMemberTrafficOverview(AGGREGATION_WINDOW_DAYS),
    getMemberDashboardSnapshot(),
  ])

  const stats: StatDefinition[] = [
    {
      id: "views",
      label: "Total views",
      value: summary.totalViews,
      icon: Eye,
      tint: "blue",
      meta: `${AGGREGATION_WINDOW_DAYS}D window`,
    },
    {
      id: "visitors",
      label: "Unique visitors",
      value: summary.uniqueVisitors,
      icon: Users,
      tint: "green",
      meta: "Audience reach",
    },
    {
      id: "upvotes",
      label: "Upvotes",
      value: summary.upvotesInRange,
      icon: ThumbsUp,
      tint: "orange",
      meta: "Community signal",
    },
  ]

  const upvotesByDate = new Map(
    summary.engagementOverTime.map((point) => [point.date, point.upvotes]),
  )
  const trafficData = summary.viewsOverTime.map((point) => ({
    date: point.date,
    label: point.label,
    views: point.views,
    uniqueVisitors: point.uniqueVisitors,
    upvotes: upvotesByDate.get(point.date) ?? 0,
  }))

  const hasChartActivity =
    summary.totalViews > 0 ||
    summary.uniqueVisitors > 0 ||
    summary.upvotesInRange > 0

  return (
    <div className="space-y-6">
      <AnalyticsStatRow stats={stats} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <MemberAnalyticsCharts
            trafficData={trafficData}
            hasTrafficActivity={hasChartActivity}
          />
          <ProductStatusPanel products={snapshot.products} />
        </div>

        <aside className="col-span-12 space-y-6 lg:col-span-4">
          <RewardsSnapshot snapshot={snapshot} />
          <PartnerSpotlightPanel />
        </aside>
      </div>
    </div>
  )
}

async function getMemberDashboardSnapshot(): Promise<MemberDashboardSnapshot> {
  const { userId } = await auth()
  if (!userId) {
    return {
      products: [],
      rewardBalance: {
        balance: 0,
        lifetimeEarned: 0,
        currentStreakCount: 0,
      },
      rewardActivity: [],
    }
  }

  const user = await requireActiveUserOrRedirect(userId)

  const [products, rewardBalance, rewardTransactions] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        status: true,
        updatedAt: true,
        publishedAt: true,
      },
    }),
    prisma.rewardBalance.findUnique({
      where: { userId: user.id },
      select: {
        balance: true,
        lifetimeEarned: true,
        currentStreakCount: true,
      },
    }),
    prisma.rewardTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        type: true,
        rewardAmount: true,
        notes: true,
        createdAt: true,
        rule: { select: { name: true } },
        catalogItem: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
  ])

  return {
    products,
    rewardBalance: rewardBalance ?? {
      balance: 0,
      lifetimeEarned: 0,
      currentStreakCount: 0,
    },
    rewardActivity: rewardTransactions.map((transaction) => ({
      id: transaction.id,
      title: getRewardActivityTitle(transaction),
      amount: transaction.rewardAmount,
      createdAt: transaction.createdAt,
    })),
  }
}

function getRewardActivityTitle(transaction: {
  type: string
  notes: string | null
  rule: { name: string } | null
  catalogItem: { name: string } | null
  product: { name: string } | null
}) {
  if (transaction.notes?.trim()) return transaction.notes.trim()
  if (transaction.type === "spend") {
    return transaction.catalogItem?.name ?? "Reward redemption"
  }
  if (transaction.rule?.name) return transaction.rule.name
  if (transaction.product?.name) return transaction.product.name
  return transaction.type === "refund" ? "Reward refund" : "Reward activity"
}

function AnalyticsStatRow({ stats }: { stats: StatDefinition[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <MetricCard key={stat.id} stat={stat} />
      ))}
    </section>
  )
}

function MetricCard({ stat }: { stat: StatDefinition }) {
  const Icon = stat.icon

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div
          className={cn(
            "rounded-lg p-2",
            stat.tint === "blue" && "bg-blue-50 text-blue-700",
            stat.tint === "green" && "bg-lime-100 text-slate-950",
            stat.tint === "orange" && "bg-orange-50 text-orange-600",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          {stat.meta}
        </span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {stat.label}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-normal text-slate-950">
        {numberFormatter.format(stat.value)}
      </p>
    </div>
  )
}

function ProductStatusPanel({ products }: { products: ProductSnapshot[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Product Status</h2>
        <Link
          href={MEMBER_PRODUCTS_PATH}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          View all
        </Link>
      </div>
      {products.length ? (
        <div className="divide-y divide-slate-200">
          {products.map((product) => (
            <ProductStatusItem key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyPanel
          icon={Package}
          title="No launches yet"
          description="Create your first product to start tracking views, upvotes, and rewards."
          action={
            <ProductDraftStartButton
              mode="member"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Add product
            </ProductDraftStartButton>
          }
        />
      )}
    </section>
  )
}

function ProductStatusItem({ product }: { product: ProductSnapshot }) {
  return (
    <Link
      href={memberProductPath(product.slug)}
      className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {product.logo ? (
            <Image
              src={product.logo}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <Package className="h-5 w-5 text-slate-400" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950">
            {product.name}
          </h3>
          <p className="text-sm text-slate-500">
            Updated {formatRelativeDate(product.updatedAt)}
          </p>
        </div>
      </div>
      <StatusBadge status={product.status} />
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "published"
      ? "Published"
      : status === "archived"
        ? "Archived"
        : "Pending"

  return (
    <span
      className={cn(
        "shrink-0 rounded px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
        status === "published" && "bg-green-50 text-green-700",
        status === "archived" && "bg-slate-100 text-slate-600",
        status !== "published" &&
          status !== "archived" &&
          "bg-orange-50 text-orange-600",
      )}
    >
      {label}
    </span>
  )
}

function RewardsSnapshot({ snapshot }: { snapshot: MemberDashboardSnapshot }) {
  const { rewardBalance, rewardActivity } = snapshot

  return (
    <section className="relative overflow-hidden rounded-xl bg-slate-950 p-6 text-white shadow-sm">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lime-300/20 blur-3xl" />
      <div className="relative">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Rewards Balance
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-normal">
              {numberFormatter.format(rewardBalance.balance)}{" "}
              <span className="text-lg" style={{ color: DODO_GREEN }}>
                SHP
              </span>
            </h2>
          </div>
          <div className="rounded-lg bg-white/10 p-2">
            <Award className="h-5 w-5" style={{ color: DODO_GREEN }} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 py-2">
            <span className="text-sm text-white/60">Daily streak</span>
            <span className="inline-flex items-center gap-1 font-semibold text-orange-400">
              <Flame className="h-4 w-4" aria-hidden />
              {numberFormatter.format(rewardBalance.currentStreakCount)} days
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Recent Activity
            </p>
            {rewardActivity.length ? (
              rewardActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">{activity.title}</span>
                  <span
                    className={cn(
                      "shrink-0 font-semibold",
                      activity.amount >= 0 ? "text-lime-300" : "text-white/70",
                    )}
                  >
                    {activity.amount >= 0 ? "+" : ""}
                    {numberFormatter.format(activity.amount)} SHP
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/60">
                Earn rewards as your products pick up engagement.
              </p>
            )}
          </div>
        </div>

        <Link
          href={MEMBER_REWARDS_PATH}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold text-slate-950 transition-transform active:scale-[0.98]"
          style={{ backgroundColor: DODO_GREEN }}
        >
          Claim rewards
        </Link>
      </div>
    </section>
  )
}

async function PartnerSpotlightPanel() {
  const products = await getPartnerSpotlightProducts(1).catch(() => [])
  const product = products[0]

  if (!product) return null

  const tagline = product.tagline?.trim()
  const logoSrc = isOptimizedImageSrc(product.logo) ? product.logo : null
  const logoFallback = product.name.slice(0, 1).toUpperCase()

  return (
    <section className="group relative overflow-hidden rounded-xl bg-[#213145] p-6 text-white shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#c0ff00]" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5 text-sm font-semibold text-[#213145]">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={`${product.name} logo`}
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            ) : (
              logoFallback
            )}
          </span>
          <span className="rounded bg-white/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c0ff00]">
            Partner Spotlight
          </span>
        </div>
        <h2 className="text-lg font-semibold">{product.name}</h2>
        {tagline ? (
          <p className="mt-2 text-sm leading-6 text-white/75">{tagline}</p>
        ) : null}
        <a
          href={`/r/sponsored/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-lime-300 transition-all group-hover:gap-2"
        >
          View partner
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </section>
  )
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 rounded-lg bg-slate-100 p-3 text-slate-500">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      {action}
    </div>
  )
}

function formatRelativeDate(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true })
}

function AnalyticsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <AnalyticsStatRowSkeleton />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <ChartCardSkeleton />
          <ListCardSkeleton />
        </div>
        <div className="col-span-12 space-y-6 lg:col-span-4">
          <PanelSkeleton className="bg-slate-950" />
          <PanelSkeleton className="bg-[#341100]" />
        </div>
      </div>
    </div>
  )
}

function AnalyticsStatRowSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`stat-skeleton-${index}`}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-start justify-between">
            <Skeleton className="h-9 w-9 rounded-lg" tone="muted" />
            <Skeleton className="h-4 w-20 rounded-full" tone="muted" />
          </div>
          <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
          <Skeleton className="mt-3 h-9 w-32 rounded-full" tone="soft" />
        </div>
      ))}
    </section>
  )
}

function ChartCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48 rounded-full" tone="soft" />
          <Skeleton className="h-4 w-72 max-w-full rounded-full" tone="muted" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" tone="muted" />
      </div>
      <Skeleton className="h-[280px] rounded-lg" tone="muted" />
    </div>
  )
}

function ListCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <Skeleton className="h-5 w-36 rounded-full" tone="soft" />
        <Skeleton className="h-4 w-16 rounded-full" tone="muted" />
      </div>
      <div className="divide-y divide-slate-200">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`product-row-skeleton-${index}`} className="flex p-4">
            <Skeleton className="h-12 w-12 rounded-lg" tone="muted" />
            <div className="ml-4 flex-1 space-y-2">
              <Skeleton className="h-5 w-48 max-w-full rounded-full" />
              <Skeleton className="h-4 w-28 rounded-full" tone="muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-6 shadow-sm",
        className,
      )}
    >
      <Skeleton className="h-4 w-32 rounded-full" tone="muted" />
      <Skeleton className="mt-4 h-8 w-40 rounded-full" tone="soft" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-full rounded-full" tone="muted" />
        <Skeleton className="h-4 w-4/5 rounded-full" tone="muted" />
        <Skeleton className="h-4 w-2/3 rounded-full" tone="muted" />
      </div>
    </div>
  )
}

export function MemberOverviewPageSkeleton() {
  return (
    <div
      className="w-full space-y-6"
      data-slot="member-overview-skeleton"
      aria-busy="true"
    >
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-9 w-96 max-w-full rounded-lg" tone="soft" />
          <Skeleton
            className="h-5 w-[34rem] max-w-full rounded-full"
            tone="muted"
          />
        </div>
        <Skeleton
          className="h-11 w-44 rounded-lg bg-slate-950/15"
          tone="muted"
        />
      </header>
      <AnalyticsSectionSkeleton />
    </div>
  )
}
