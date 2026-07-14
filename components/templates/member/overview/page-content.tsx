import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { auth, currentUser } from "@clerk/nextjs/server"
import { formatDistanceToNow } from "date-fns"
import {
  ArrowRight,
  ExternalLink,
  Eye,
  Package,
  Rocket,
  ThumbsUp,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"

import { getMemberTrafficOverview } from "@/actions/member/overview/actions"
import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import ProductDraftStartButton from "@/components/pages/products/ProductDraftStartButton"
import { MemberAnalyticsCharts } from "@/components/templates/member/overview/analytics-charts"
import prisma from "@/lib/prisma"
import { isOptimizedImageSrc } from "@/lib/images/sources"
import { cn } from "@/lib/utils"
import { MEMBER_PRODUCTS_PATH, memberProductPath } from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"

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

type MemberDashboardSnapshot = {
  products: ProductSnapshot[]
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
          Launch a product
        </ProductDraftStartButton>
      </header>

      <Suspense fallback={null}>
        <MemberOverviewDashboard />
      </Suspense>
    </div>
  )
}

async function MemberOverviewDashboard() {
  const [summary, snapshot] = await Promise.all([
    getMemberTrafficOverview(ANALYTICS_REPORTING_WINDOW_DAYS),
    getMemberDashboardSnapshot(),
  ])

  if (!snapshot.products.length) {
    return <FirstLaunchActivationPanel />
  }

  const stats: StatDefinition[] = [
    {
      id: "views",
      label: "Total views",
      value: summary.totalViews,
      icon: Eye,
      tint: "blue",
      meta: `${ANALYTICS_REPORTING_WINDOW_DAYS}D window`,
    },
    {
      id: "visits",
      label: "Visitors",
      value: summary.uniqueVisitors,
      icon: Users,
      tint: "green",
      meta: "Product visits",
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
            rangeDays={summary.rangeDays}
            hasTrafficActivity={hasChartActivity}
          />
          <ProductStatusPanel products={snapshot.products} />
        </div>

        <aside className="col-span-12 space-y-6 lg:col-span-4">
          <LaunchFocusPanel products={snapshot.products} />
          <PartnerSpotlightPanel />
        </aside>
      </div>
    </div>
  )
}

async function getMemberDashboardSnapshot(): Promise<MemberDashboardSnapshot> {
  const { userId } = await auth()
  if (!userId) {
    return { products: [] }
  }

  const user = await requireActiveUserOrRedirect(userId)

  const products = await prisma.product.findMany({
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
  })

  return { products }
}

function FirstLaunchActivationPanel() {
  const nextSteps = [
    "Add your product details and launch assets.",
    "Choose a free launch or optional paid reach.",
    "Publish and track views, visits, and upvotes here.",
  ] as const

  return (
    <section
      aria-labelledby="first-launch-title"
      className="relative overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_52%)]"
        aria-hidden
      />
      <div className="relative grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] md:px-10 md:py-10">
        <div className="flex flex-col items-start">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            <Rocket className="h-4 w-4" aria-hidden />
            Your next step
          </div>
          <h2
            id="first-launch-title"
            className="mt-5 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl"
          >
            Launch your first product
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Your dashboard starts measuring views, visits, and upvotes after you
            publish. Create your product page to generate the first meaningful
            signals.
          </p>
          <ProductDraftStartButton
            mode="member"
            className="group mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            Start your first launch
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </ProductDraftStartButton>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
          <h3 className="text-sm font-semibold text-slate-950">
            What happens next
          </h3>
          <ol className="mt-4 space-y-4">
            {nextSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-sm leading-5 text-slate-600">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
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
          description="Create your first product to start tracking views, upvotes, and launch activity."
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

function LaunchFocusPanel({ products }: { products: ProductSnapshot[] }) {
  const publishedCount = products.filter(
    (product) => product.status === "published",
  ).length
  const latestProduct = products[0] ?? null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Launch Activity
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">
            {numberFormatter.format(products.length)}
          </h2>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
          <Rocket className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 py-2">
          <span className="text-sm text-slate-500">Published</span>
          <span className="font-semibold text-slate-950">
            {numberFormatter.format(publishedCount)}
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Latest update
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {latestProduct
              ? `${latestProduct.name} updated ${formatRelativeDate(
                  latestProduct.updatedAt,
                )}`
              : "Add a launch to start tracking performance."}
          </p>
        </div>
        <Link
          href={MEMBER_PRODUCTS_PATH}
          className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Manage products
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
