import { notFound, redirect } from "next/navigation"
import { formatDate } from "@/lib/ui/formatters"
import { VerifyDomainButton } from "@/components/molecules/VerifyDomainButton"
import { getProductById } from "@/actions/products/actions"
import { requireManageableProduct } from "@/lib/server/productAccess"
import CopyButton from "@/components/molecules/CopyButton"
import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { choosePlanAction } from "@/actions/member/products/actions"
import {
  memberProductAnalyticsPath,
  memberProductDeletePath,
  memberProductEditPath,
  memberProductPath,
  memberProductUpgradePath,
  productPath,
} from "@/lib/routes"
import {
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  LockKeyhole,
  MapPin,
  Megaphone,
  Rocket,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { getPublicPlans } from "@/actions/public/plans/actions"
// startPlanCheckoutAction and setProductPlanAction are used inside choosePlanAction
import { hasPlanFeature } from "@/lib/features"
import { resolveProductAnalyticsAccess } from "@/lib/server/analytics/productAnalytics"
import ProductBadgeCelebrationGate from "@/components/molecules/ProductBadgeCelebrationGate"
import MemberProductHeaderActions from "@/components/molecules/MemberProductHeaderActions"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { Image } from "@/components/atoms/image"
import { cn } from "@/lib/utils"
import { PrivateHeaderSlot } from "@/components/layout/headers/private-header-slot"

const dashedCalloutClass =
  "rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3"
const panelClass =
  "rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
const panelTitleClass = "text-base font-semibold text-[#0b1c30]"
const mutedTextClass = "text-sm text-[#43474c]"

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? "P") + (parts[1]?.[0] ?? "")
}

function humanize(value?: string | null) {
  if (!value) return "Not set"
  return value.replace(/_/g, " ")
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(Math.max(0, value))
}

function formatFullNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value))
}

function formatSignedPercent(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return "0%"
  const rounded = Math.round((value ?? 0) * 10) / 10
  const prefix = rounded > 0 ? "+" : ""
  return `${prefix}${rounded}%`
}

function sharePercent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (value / total) * 100))
}

export default async function ViewUserProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = (await searchParams) || {}
  const celebrateValue = sp["celebrate"]
  const celebrate = Array.isArray(celebrateValue)
    ? celebrateValue.includes("1")
    : celebrateValue === "1"

  const { product: manageableProduct, currentUser } =
    await requireManageableProduct(slug, {
      unauthorizedRedirect: null,
      missingRedirect: null,
    })

  const product = await getProductById(manageableProduct.id)
  if (!product) return notFound()
  if (!product.plan) {
    redirect(memberProductUpgradePath(product.slug))
  }
  const productId = product.id
  const productSlug = product.slug
  const isOwner = manageableProduct.userId === currentUser.id
  const publicPath = productPath(productSlug)
  const analyticsPath = memberProductAnalyticsPath(productSlug)
  const editPath = memberProductEditPath(productSlug)
  const { hasBasicAnalytics } = resolveProductAnalyticsAccess({
    plan: product.plan,
  })
  const canViewAnalytics = hasBasicAnalytics
  const isFreePlan = !product.plan || product.plan.isDefault
  const [allPlans, trafficSummary] = await Promise.all([
    getPublicPlans().catch(() => []),
    getProductTrafficSummary(productId, {
      rangeDays: 30,
      includeAdvanced: canViewAnalytics,
      previousComparison: true,
    }).catch((error) => {
      console.error("Failed to load product traffic summary", {
        productId,
        error,
      })
      return null
    }),
  ])
  const currentPlanPublic = allPlans.find((p) => p.id === product.plan?.id)
  const productPlanType = product.plan?.type ?? currentPlanPublic?.type ?? null
  const hasPaidPlan = !isFreePlan && (product.plan?.price ?? 0) > 0
  const headerPlanAction = isFreePlan
    ? "promote"
    : hasPaidPlan && productPlanType === "recurring_price"
      ? "manage_subscription"
      : "none"
  const sortedPlans = [...allPlans].sort(
    (a, b) => (a.price ?? 0) - (b.price ?? 0),
  )
  const hasRecurringPlans = sortedPlans.some(
    (plan) => plan.type === "recurring_price",
  )
  const targetPlanType =
    isFreePlan && hasRecurringPlans
      ? "recurring_price"
      : currentPlanPublic?.type === "recurring_price"
        ? "recurring_price"
        : "one_time_price"
  const typeFilteredPlans = sortedPlans.filter(
    (plan) => plan.type === targetPlanType,
  )
  const upgradeCandidates = (() => {
    if (!isFreePlan) {
      return []
    }

    if (currentPlanPublic) {
      return typeFilteredPlans.filter(
        (plan) => (plan.price ?? 0) > (currentPlanPublic.price ?? 0),
      )
    }
    const paidPlans = typeFilteredPlans.filter((plan) => (plan.price ?? 0) > 0)
    return paidPlans.length ? paidPlans : typeFilteredPlans
  })()
  const nextPlan = upgradeCandidates[0]
  const canPromoteProduct = Boolean(nextPlan)
  const nextPlanNewBenefits = nextPlan
    ? nextPlan.features
        .filter((feature) => feature.enabled)
        .filter((feature) => !hasPlanFeature(product.plan ?? null, feature.key))
    : []
  const nextPlanHighlights = nextPlanNewBenefits.slice(0, 3).map((feature) => ({
    id: feature.id,
    name: feature.displayName || feature.name,
  }))
  const nextPlanHighlightCount = nextPlanNewBenefits.length
  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  })
  const getPlanPricing = (plan: (typeof allPlans)[number]) => {
    const pctRaw = plan.discount ?? 0
    const pct = Math.min(Math.max(pctRaw, 0), 100)
    const originalCents = plan.price ?? 0
    const discountedCents =
      pct > 0 && pct < 100
        ? Math.round(originalCents * (1 - pct / 100))
        : originalCents
    return {
      pct,
      original:
        pct > 0 && pct < 100 ? usdFormatter.format(originalCents / 100) : null,
      priceText: usdFormatter.format(discountedCents / 100),
    }
  }

  const choosePlan = choosePlanAction.bind(null, {
    productId,
    redirectPath: memberProductPath(productSlug),
  })
  const upgradePath = memberProductUpgradePath(productSlug)

  const formatHost = (value?: string | null) => {
    if (!value) return null
    try {
      const host = new URL(value).hostname.replace(/^www\./, "")
      return host || value
    } catch {
      return value
    }
  }

  const tags = product.keywords || []
  const websiteHost = formatHost(product.websiteUrl) ?? product.websiteUrl
  const metadata = product.metadata

  const descriptionLength = (product.description || "").trim().length
  const descriptionReady = descriptionLength >= 200
  const galleryCount = (product.ProductMedia || []).length
  const galleryReady = galleryCount >= 3
  const bannerReady = Boolean(product.bannerImage)

  const requiresStartingPrice =
    product.pricingModel === "subscription" ||
    product.pricingModel === "one_time"
  const hasStartingPrice =
    product.startingPriceCents != null && Boolean(product.currencyCode)
  const pricingReady = !requiresStartingPrice || hasStartingPrice

  const keywordsReady = tags.length >= 3
  const socialsReady = Boolean(
    metadata?.githubUrl ||
    metadata?.twitterUrl ||
    metadata?.videoUrl ||
    metadata?.contactEmail,
  )

  const listingChecklistItems: Array<{
    key: string
    label: string
    note?: string
    complete: boolean
    href?: string
  }> = [
    {
      key: "description",
      label: "Description is strong",
      note: `${descriptionLength} chars (aim for 200+)`,
      complete: descriptionReady,
      href: `${editPath}#section-core`,
    },
    {
      key: "screenshots",
      label: "Add screenshots",
      note: `${galleryCount}/6 screenshots`,
      complete: galleryReady,
      href: `${editPath}#section-media`,
    },
    {
      key: "banner",
      label: "Set banner image",
      note: bannerReady
        ? "Looks great on the feed"
        : "Recommended for better clicks",
      complete: bannerReady,
      href: `${editPath}#section-media`,
    },
    {
      key: "pricing",
      label: "Pricing details complete",
      note: requiresStartingPrice
        ? pricingReady
          ? "Starting price set"
          : "Add starting price + currency"
        : "All set for this pricing model",
      complete: pricingReady,
      href: `${editPath}#section-pricing`,
    },
    {
      key: "keywords",
      label: "Add keywords",
      note: `${tags.length} keywords`,
      complete: keywordsReady,
      href: `${editPath}#section-core`,
    },
    {
      key: "socials",
      label: "Add socials/contact",
      note: socialsReady ? "Nice." : "GitHub, X, video, or email",
      complete: socialsReady,
      href: `${editPath}#section-details`,
    },
    {
      key: "publish",
      label: "Publish your listing",
      note:
        product.status === "published"
          ? "Live"
          : "Status is managed by Shipyard",
      complete: product.status === "published",
    },
  ]
  const upvoteCount = product.analytics?.upvotes ?? 0
  const publishPrereqsComplete = listingChecklistItems
    .filter((item) => item.key !== "publish")
    .every((item) => item.complete)

  const publishAndBoost = async (formData: FormData) => {
    "use server"
    await choosePlanAction(
      { productId, redirectPath: memberProductPath(productSlug) },
      formData,
    )
  }

  const boostMode =
    product.status !== "published"
      ? publishPrereqsComplete
        ? "setup_before_publish"
        : "finish_setup"
      : "boost"
  const boostCardTitle =
    product.status !== "published"
      ? publishPrereqsComplete
        ? "Ready for review — set up your boost"
        : "Boost once you're live"
      : upvoteCount === 0
        ? "Want more impressions? Boost to get featured"
        : "Want more visibility? Boost your listing"
  const boostCtaLabel =
    boostMode === "setup_before_publish"
      ? "Set up boost"
      : boostMode === "finish_setup"
        ? "View upgrade options"
        : upvoteCount === 0
          ? "Boost to get featured"
          : "Boost listing"
  const boostCtaHint =
    boostMode === "setup_before_publish"
      ? "Checkout runs now; placement starts after Shipyard publishes."
      : boostMode === "finish_setup"
        ? "Choose a boost now; it starts after you publish."
        : null
  const boostTimingText =
    product.status === "published"
      ? "Starts immediately"
      : "Starts after publish"
  const boostFormAction =
    boostMode === "setup_before_publish" ? publishAndBoost : choosePlan

  const pageViews30d = trafficSummary?.totalViews ?? 0
  const visitors30d = trafficSummary?.uniqueVisitors ?? 0
  const viewsDelta = trafficSummary?.totalViewsChange ?? 0
  const trafficTrendPositive = viewsDelta >= 0
  const trafficBars = trafficSummary?.viewsOverTime.slice(-8) ?? []
  const trafficBarMax = Math.max(1, ...trafficBars.map((point) => point.views))
  const topReferrers = trafficSummary?.referrerBreakdown.slice(0, 3) ?? []
  const totalReferrerViews = topReferrers.reduce(
    (sum, item) => sum + item.views,
    0,
  )
  const topCountries = trafficSummary?.countryBreakdown.slice(0, 3) ?? []
  const totalCountryViews = topCountries.reduce(
    (sum, item) => sum + item.views,
    0,
  )
  const publicUrl = `shipyardhq.com${publicPath}`
  const verificationStatus = product.verification?.isVerified
    ? "Verified"
    : product.verification
      ? "Pending"
      : "Not configured"
  const verificationTone = product.verification?.isVerified
    ? "text-emerald-700"
    : product.verification
      ? "text-amber-700"
      : "text-slate-500"
  return (
    <>
      <ProductBadgeCelebrationGate
        initialOpen={celebrate}
        productPublicPath={publicPath}
      />
      <PrivateHeaderSlot>
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-[#061d31] text-xs font-semibold text-white">
              {product.logo ? (
                <Image
                  src={product.logo}
                  alt={`${product.name} logo`}
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  eager
                />
              ) : (
                initials(product.name)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-[#00162a]">
                  {product.name}
                </h1>
                <span className="rounded border border-[#F97316]/20 bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F97316]">
                  {humanize(product.status)}
                </span>
              </div>
              <p className="truncate text-xs text-[#71869e]">
                {product.tagline || websiteHost}
              </p>
            </div>
          </div>
          <MemberProductHeaderActions
            status={product.status as any}
            publicPath={publicPath}
            editPath={editPath}
            analyticsPath={analyticsPath}
            canViewAnalytics={canViewAnalytics}
            upgradePath={upgradePath}
            deletePath={memberProductDeletePath(product.slug)}
            canDelete={isOwner}
            showStatus={false}
            planAction={headerPlanAction}
            className="justify-start lg:justify-end"
          />
        </div>
      </PrivateHeaderSlot>
      <main className="-m-4 bg-[#F8FAFC] text-[#0b1c30] md:-m-6">
        <div className="w-full p-4 md:p-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 xl:col-span-8">
              <section className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={panelTitleClass}>Live Performance Pulse</h2>
                    <p className={mutedTextClass}>Last 30 days</p>
                  </div>
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold",
                      trafficTrendPositive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700",
                    )}
                  >
                    <TrendingUp className="size-4" aria-hidden />
                    {formatSignedPercent(viewsDelta)}
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-[1fr_1fr_1.4fr]">
                  <div>
                    <p className="text-xs font-semibold text-[#71869e]">
                      Total Upvotes
                    </p>
                    <p className="mt-1 text-4xl font-semibold text-[#00162a]">
                      {formatCompactNumber(upvoteCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#71869e]">
                      Page Views
                    </p>
                    <p className="mt-1 text-4xl font-semibold text-[#00162a]">
                      {formatCompactNumber(pageViews30d)}
                    </p>
                    <p className="mt-1 text-xs text-[#71869e]">
                      {formatFullNumber(visitors30d)} unique visitors
                    </p>
                  </div>
                  <div className="flex min-h-24 flex-col justify-end">
                    <div className="mb-2 flex items-center justify-between text-xs text-[#0051d5]">
                      <span className="font-semibold">Traffic trend</span>
                      <Link
                        href={canViewAnalytics ? analyticsPath : upgradePath}
                        className="hover:underline"
                      >
                        {canViewAnalytics ? "Open analytics" : "Unlock"}
                      </Link>
                    </div>
                    <div className="flex h-16 items-end gap-1">
                      {(trafficBars.length
                        ? trafficBars
                        : Array(8).fill(null)
                      ).map((point, index) => {
                        const views = point?.views ?? 0
                        const height = views
                          ? Math.max(12, (views / trafficBarMax) * 100)
                          : 8
                        return (
                          <div
                            key={point?.date ?? index}
                            className="min-w-0 flex-1 rounded-t bg-[#0051d5]"
                            style={{
                              height: `${height}%`,
                              opacity: views ? 0.35 + index * 0.07 : 0.12,
                            }}
                            title={
                              point
                                ? `${point.label}: ${formatFullNumber(views)} views`
                                : "No traffic"
                            }
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <section className={panelClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <Share2 className="size-5 text-[#0051d5]" aria-hidden />
                    <h2 className={panelTitleClass}>Top Referrers</h2>
                  </div>
                  {canViewAnalytics ? (
                    topReferrers.length ? (
                      <div className="space-y-3">
                        {topReferrers.map((item) => {
                          const percent = sharePercent(
                            item.views,
                            totalReferrerViews,
                          )
                          return (
                            <div key={item.referrer} className="space-y-2">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-[#0b1c30]">
                                  {item.referrer === "(direct)"
                                    ? "Direct"
                                    : item.referrer}
                                </span>
                                <span className="text-[#43474c]">
                                  {Math.round(percent)}%
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[#EFF6FF]">
                                <div
                                  className="h-full rounded-full bg-[#0051d5]"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className={mutedTextClass}>
                        Referrer data will appear as tracked traffic arrives.
                      </p>
                    )
                  ) : (
                    <div className={dashedCalloutClass}>
                      <div className="flex items-start gap-2 text-sm text-[#43474c]">
                        <LockKeyhole className="mt-0.5 size-4" aria-hidden />
                        <div>
                          <p className="font-medium text-[#0b1c30]">
                            Source breakdown is locked.
                          </p>
                          <Link
                            href={upgradePath}
                            className="text-[#0051d5] hover:underline"
                          >
                            Upgrade to unlock referrer insights
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section className={panelClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="size-5 text-[#0051d5]" aria-hidden />
                    <h2 className={panelTitleClass}>Geographic Distribution</h2>
                  </div>
                  {canViewAnalytics ? (
                    topCountries.length ? (
                      <div className="space-y-3">
                        {topCountries.map((item) => {
                          const percent = sharePercent(
                            item.views,
                            totalCountryViews,
                          )
                          return (
                            <div key={item.country} className="space-y-2">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-[#0b1c30]">
                                  {item.country || "Unknown"}
                                </span>
                                <span className="text-[#43474c]">
                                  {Math.round(percent)}%
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[#EFF6FF]">
                                <div
                                  className="h-full rounded-full bg-[#0051d5]"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className={mutedTextClass}>
                        Country data will populate after analytics ingestion.
                      </p>
                    )
                  ) : (
                    <div className={dashedCalloutClass}>
                      <div className="flex items-start gap-2 text-sm text-[#43474c]">
                        <LockKeyhole className="mt-0.5 size-4" aria-hidden />
                        <div>
                          <p className="font-medium text-[#0b1c30]">
                            Geography is locked.
                          </p>
                          <Link
                            href={upgradePath}
                            className="text-[#0051d5] hover:underline"
                          >
                            Upgrade to unlock locations
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <section className={panelClass}>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className={panelTitleClass}>Public Listing Preview</h2>
                    <p className={mutedTextClass}>{publicUrl}</p>
                  </div>
                  <Link
                    href={publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open public listing"
                    className="rounded-md p-2 text-[#71869e] transition-colors hover:bg-[#F8FAFC] hover:text-[#0b1c30]"
                  >
                    <ExternalLink className="size-5" aria-hidden />
                  </Link>
                </div>
                <div className="flex flex-col gap-5 border-t border-[#E2E8F0] pt-5 md:flex-row md:items-center">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#061d31] text-2xl font-semibold text-white">
                    {product.logo ? (
                      <Image
                        src={product.logo}
                        alt={`${product.name} logo`}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      initials(product.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-[#0b1c30]">
                        {product.name}
                      </h3>
                      <Badge variant="outline">{product.category.name}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#43474c]">
                      {product.tagline || "Add a concise tagline."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(tags.length
                        ? tags.slice(0, 4)
                        : [humanize(product.type)]
                      ).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#F8FAFC] px-2 py-1 text-xs font-semibold text-[#43474c]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex w-fit shrink-0 flex-col items-center rounded-lg border border-[#0051d5]/20 bg-[#EFF6FF] px-4 py-3 text-[#0051d5]">
                    <ArrowUp className="size-5 fill-current" aria-hidden />
                    <span className="text-lg font-semibold">
                      {formatCompactNumber(upvoteCount)}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <aside className="col-span-12 space-y-6 xl:col-span-4">
              {canPromoteProduct ? (
                <section className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <div className="bg-[#061d31] p-5 text-white">
                    <div className="flex items-center gap-2">
                      <Megaphone className="size-5" aria-hidden />
                      <h2 className="text-base font-semibold">
                        Promotion Center
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-white/75">
                      Accelerate discovery for this listing.
                    </p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="rounded-lg border border-[#E2E8F0] p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Rocket
                              className="size-4 text-[#F97316]"
                              aria-hidden
                            />
                            <h3 className="text-sm font-semibold text-[#0b1c30]">
                              {boostCardTitle}
                            </h3>
                          </div>
                          <p className="mt-1 text-xs text-[#43474c]">
                            {nextPlan.name} · Featured for{" "}
                            {nextPlan.boostForDays ?? 1} day(s) ·{" "}
                            {boostTimingText}
                          </p>
                        </div>
                        {(() => {
                          const pricing = getPlanPricing(nextPlan)
                          return (
                            <div className="shrink-0 text-right">
                              {pricing.original ? (
                                <div className="text-xs text-[#71869e] line-through">
                                  {pricing.original}
                                </div>
                              ) : null}
                              <div className="font-semibold text-[#F97316]">
                                {pricing.priceText}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                      {nextPlanHighlights.length ? (
                        <ul className="mb-4 space-y-1 text-xs text-[#43474c]">
                          {nextPlanHighlights.map((feature) => (
                            <li key={feature.id} className="flex gap-2">
                              <CheckCircle2
                                className="mt-0.5 size-3.5 text-emerald-700"
                                aria-hidden
                              />
                              <span>{feature.name}</span>
                            </li>
                          ))}
                          {nextPlanHighlightCount >
                          nextPlanHighlights.length ? (
                            <li className="text-[#71869e]">
                              +{" "}
                              {nextPlanHighlightCount -
                                nextPlanHighlights.length}{" "}
                              more benefits
                            </li>
                          ) : null}
                        </ul>
                      ) : nextPlan.description ? (
                        <p className="mb-4 text-xs text-[#43474c]">
                          {nextPlan.description}
                        </p>
                      ) : null}
                      {boostMode === "finish_setup" ? (
                        <Button className="w-full" asChild>
                          <Link href={upgradePath}>
                            <Sparkles className="size-4" aria-hidden />
                            {boostCtaLabel}
                          </Link>
                        </Button>
                      ) : (
                        <form action={boostFormAction}>
                          <input
                            type="hidden"
                            name="planId"
                            value={nextPlan.id}
                          />
                          <Button className="w-full">
                            <Sparkles className="size-4" aria-hidden />
                            {boostCtaLabel}
                          </Button>
                        </form>
                      )}
                      {boostCtaHint ? (
                        <p className="mt-2 text-xs text-[#71869e]">
                          {boostCtaHint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : null}

              <section className={panelClass}>
                <div className="mb-5 flex items-center gap-2">
                  <ShieldCheck
                    className="size-5 text-emerald-700"
                    aria-hidden
                  />
                  <h2 className={panelTitleClass}>System Health</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
                    <span className={mutedTextClass}>Domain status</span>
                    <span
                      className={cn("text-xs font-semibold", verificationTone)}
                    >
                      {verificationStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
                    <span className={mutedTextClass}>Primary domain</span>
                    <code className="truncate text-xs text-[#0051d5]">
                      {websiteHost}
                    </code>
                  </div>
                  {product.verification ? (
                    <div className="space-y-3">
                      <div>
                        <div className="mb-2 text-xs font-semibold text-[#71869e]">
                          TXT record
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-xs text-[#43474c]">
                            {product.verification.verificationTxt}
                          </code>
                          <CopyButton
                            text={product.verification.verificationTxt}
                            label="Copy"
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-[#71869e]">
                          {product.verification.verifiedAt ? (
                            <>
                              Verified{" "}
                              {formatDate(product.verification.verifiedAt)}
                            </>
                          ) : (
                            "DNS check pending"
                          )}
                        </div>
                        <VerifyDomainButton
                          productId={product.id}
                          label={
                            product.verification.isVerified
                              ? "Re-check"
                              : "Verify"
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <p className={mutedTextClass}>
                      No verification record has been generated for this
                      product.
                    </p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}
