import { notFound, redirect } from "next/navigation"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { OverviewRow } from "@/components/layout/object-view/overview"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import {
  formatBoolean,
  formatCurrency,
  formatDate,
  image,
  placeholder,
  slug as slugFmt,
} from "@/lib/ui/formatters"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { VerifyDomainButton } from "@/components/molecules/VerifyDomainButton"
import { getProductById } from "@/actions/admin/products/actions"
import ProductMediaManager from "@/components/molecules/ProductMediaManager"
import { requireManageableProduct } from "@/lib/server/productAccess"
import ProductStatusMenu from "@/components/molecules/ProductStatusMenu"
import CopyButton from "@/components/molecules/CopyButton"
import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  choosePlanAction,
  validatePaymentAndAttachPlan,
} from "@/actions/member/products/actions"
import {
  memberProductAnalyticsPath,
  memberProductEditPath,
  memberProductInsightsPath,
  memberProductUpdatesPath,
  memberProductPath,
  productPath,
} from "@/lib/routes"
import ShareOnXButton from "@/components/molecules/ShareOnXButton"
import {
  BarChart3,
  Building2,
  ExternalLink,
  Megaphone,
  Sparkles,
  Github as GithubIcon,
  Globe,
  Mail,
  MousePointerClick,
  Tag,
  Target,
  Twitter as TwitterIcon,
  Video,
} from "lucide-react"
import PerformanceCard from "@/components/molecules/PerformanceCard"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { PlanType } from "@/lib/vendor/prisma/client"
// startPlanCheckoutAction and setProductPlanAction are used inside choosePlanAction
import { hasPlanFeature } from "@/lib/features"
import { resolveProductAnalyticsAccess } from "@/lib/server/analytics/productAnalytics"
import PurchasePlanToast from "@/components/molecules/PurchasePlanToast"
import ProductBadgeCelebrationGate from "@/components/molecules/ProductBadgeCelebrationGate"
import ProductBadgeCelebrationTrigger from "@/components/molecules/ProductBadgeCelebrationTrigger"
import { JSX } from "react"
import { getRecentProductUpvoters } from "@/lib/server/productUpvotes"
import { getProductReviewSummary } from "@/lib/server/productReviews"

const chipIconClass = "h-3.5 w-3.5 text-muted-foreground"
const infoChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
const accentChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700"
const placeholderTextClass = "text-xs text-muted-foreground"
const calloutPanelClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
const dashedCalloutClass =
  "rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3"
const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
const actionGroupClass =
  "flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-2 py-1 shadow-sm ring-1 ring-slate-200/70"
const radiantButtonWrapperClass =
  "relative inline-flex items-center justify-center"
const radiantButtonGlowClass =
  "pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-[radial-gradient(circle,var(--brand-1)/0.32,transparent_70%)] blur-sm"
const radiantSecondaryWrapperClass =
  "relative inline-flex items-center justify-center"
const radiantSecondaryGlowClass =
  "pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-[radial-gradient(circle,rgba(29,155,240,0.35),transparent_70%)] blur-sm"

export default async function ViewUserProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = (await searchParams) || {}
  const paymentId = (sp["payment_id"] as string) || ""
  const status = (sp["status"] as string) || ""
  const celebrateValue = sp["celebrate"]
  const celebrate = Array.isArray(celebrateValue)
    ? celebrateValue.includes("1")
    : celebrateValue === "1"

  if (paymentId && status) {
    await validatePaymentAndAttachPlan(paymentId)
    // Clean URL params regardless of outcome
    redirect(memberProductPath(slug))
  }
  const { product: manageableProduct, currentUser } =
    await requireManageableProduct(slug, {
      unauthorizedRedirect: null,
      missingRedirect: null,
    })

  const product = await getProductById(manageableProduct.id)
  if (!product) return notFound()
  const productId = product.id
  const productSlug = product.slug
  const isOwner = manageableProduct.userId === currentUser.id
  const canManage = true
  const publicPath = productPath(productSlug)
  const analyticsPath = memberProductAnalyticsPath(productSlug)
  const insightsPath = memberProductInsightsPath(productSlug)
  const updatesPath = memberProductUpdatesPath(productSlug)
  const { hasBasicAnalytics } = resolveProductAnalyticsAccess({
    plan: product.plan,
    featureEntitlements: product.featureEntitlements ?? [],
  })
  const canViewAnalytics = hasBasicAnalytics
  const upvoters = await getRecentProductUpvoters(productId, 8).catch(() => [])
  const reviewSummary = await getProductReviewSummary(productId, 6)

  const reviewerDisplayName = (first?: string | null, last?: string | null) => {
    const parts = [first?.trim(), last?.trim()].filter(Boolean)
    return parts.length ? parts.join(" ") : "Shipyard member"
  }

  const allPlans = await getPublicPlans({
    type: PlanType.one_time_price,
  }).catch(() => [])
  const currentPlanPublic = allPlans.find((p) => p.id === product.plan?.id)
  const sortedPlans = [...allPlans].sort(
    (a, b) => (a.price ?? 0) - (b.price ?? 0),
  )
  const upgradeCandidates = (() => {
    if (currentPlanPublic) {
      return sortedPlans.filter(
        (plan) => (plan.price ?? 0) > (currentPlanPublic.price ?? 0),
      )
    }
    const paidPlans = sortedPlans.filter((plan) => (plan.price ?? 0) > 0)
    return paidPlans.length ? paidPlans : sortedPlans
  })()
  const planBenefitSummaries = upgradeCandidates.map((plan) => {
    const enabled = plan.features.filter((feature) => feature.enabled)
    const newBenefits = enabled.filter(
      (feature) => !hasPlanFeature(product.plan ?? null, feature.key),
    )
    return {
      plan,
      topHighlights: newBenefits
        .slice(0, 3)
        .map((feature) => ({ id: feature.id, name: feature.name })),
      highlightCount: newBenefits.length,
    }
  })
  const benefitSummaryById = new Map(
    planBenefitSummaries.map((entry) => [entry.plan.id, entry]),
  )
  const nextPlan = upgradeCandidates[0]
  const topPlanCandidate = upgradeCandidates.length
    ? upgradeCandidates[upgradeCandidates.length - 1]
    : undefined
  const deltaTop = nextPlan
    ? (benefitSummaryById.get(nextPlan.id)?.topHighlights ?? [])
    : []
  const deltaCount = nextPlan
    ? (benefitSummaryById.get(nextPlan.id)?.highlightCount ?? 0)
    : 0
  const alternatePlanSummaries = nextPlan
    ? planBenefitSummaries.filter((entry) => entry.plan.id !== nextPlan.id)
    : planBenefitSummaries
  const topPlanId = topPlanCandidate?.id ?? null
  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  })
  const percentFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
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

  const exclusiveCurrentTop: { id: string; name: string }[] = (() => {
    if (!currentPlanPublic) return []
    const cheaper = allPlans
      .filter((p) => p.price < currentPlanPublic.price)
      .sort((a, b) => b.price - a.price)
    const prev = cheaper[0]
    const currentEnabled = new Set(
      currentPlanPublic.features.filter((f) => f.enabled).map((f) => f.key),
    )
    const prevEnabled = new Set(
      (prev?.features || []).filter((f) => f.enabled).map((f) => f.key),
    )
    const exclusive = Array.from(currentEnabled).filter(
      (k) => !prevEnabled.has(k),
    )
    const nameByKey = new Map(
      currentPlanPublic.features.map((f) => [f.key, f.name] as const),
    )
    return exclusive
      .slice(0, 4)
      .map((key) => ({ id: key, name: nameByKey.get(key) || key }))
  })()

  const choosePlan = choosePlanAction.bind(null, {
    productId,
    redirectPath: memberProductPath(productSlug),
  })
  const showPlanUI = Boolean(currentPlanPublic)

  const formatHost = (value?: string | null) => {
    if (!value) return null
    try {
      const host = new URL(value).hostname.replace(/^www\./, "")
      return host || value
    } catch {
      return value
    }
  }

  const platforms = (product.platforms || []).map((platform: string) =>
    platform.replace(/_/g, " "),
  )
  const tags = product.keywords || []
  const alternativesList = Array.isArray(product.alternatives)
    ? product.alternatives
    : []
  const organizationName = product.organization?.name ?? ""
  const organizationUrl = product.organization?.url ?? ""
  const organizationHost = organizationUrl ? formatHost(organizationUrl) : null
  const websiteHost = formatHost(product.websiteUrl) ?? product.websiteUrl
  const ctaLabel = product.ctaLabel ?? ""
  const ctaUrl = product.ctaUrl ?? ""
  const ctaHost = (() => {
    if (!ctaUrl) return ""
    try {
      const host = new URL(ctaUrl).hostname.replace(/^www\./, "")
      return host || ctaUrl
    } catch {
      return ctaUrl
    }
  })()
  const hasCtaPair = Boolean(ctaLabel && ctaUrl)
  const metadata = product.metadata

  const extraLinks: Array<{
    key: string
    label: string
    href: string
    icon: JSX.Element
  }> = []

  if (organizationUrl) {
    extraLinks.push({
      key: "organization-url",
      label: organizationHost ?? organizationUrl,
      href: organizationUrl,
      icon: <Building2 className={chipIconClass} />,
    })
  }

  if (metadata?.githubUrl) {
    const href = metadata.githubUrl
    extraLinks.push({
      key: "github",
      label: formatHost(href) ?? href,
      href,
      icon: <GithubIcon className={chipIconClass} />,
    })
  }

  if (metadata?.twitterUrl) {
    const href = metadata.twitterUrl
    extraLinks.push({
      key: "twitter",
      label: formatHost(href) ?? href,
      href,
      icon: <TwitterIcon className={chipIconClass} />,
    })
  }

  if (metadata?.demoUrl) {
    const href = metadata.demoUrl
    extraLinks.push({
      key: "demo",
      label: formatHost(href) ?? href,
      href,
      icon: <Video className={chipIconClass} />,
    })
  }

  if (metadata?.contactEmail) {
    extraLinks.push({
      key: "contact",
      label: metadata.contactEmail,
      href: `mailto:${metadata.contactEmail}`,
      icon: <Mail className={chipIconClass} />,
    })
  }

  return (
    <>
      <ProductBadgeCelebrationGate
        initialOpen={celebrate}
        productPublicPath={publicPath}
      />
      <PurchasePlanToast />
      <ObjectPageLayout
        heading={{
          id: product.slug,
          title: product.name,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          slug: product.id,
        }}
        overview={[
          {
            label: "Name",
            value: (
              <span className="inline-flex items-center gap-2">
                {product.name}
                <Link
                  href={publicPath}
                  target="_blank"
                  aria-label="View public page"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </span>
            ),
          },
          { label: "Category", value: product.category.name },
          {
            label: "Status",
            value: (
              <Badge
                variant={
                  (product.status === "published"
                    ? "success"
                    : product.status === "draft"
                      ? "secondary"
                      : "outline") as any
                }
              >
                {product.status}
              </Badge>
            ),
          },
          { label: "Type", value: product.type.replace("_", " ") },
          {
            label: "Pricing",
            value: (
              <span>
                {product.pricingModel.replace("_", " ")}
                {product.startingPriceCents != null && product.currencyCode ? (
                  <>
                    {" "}
                    —{" "}
                    {formatCurrency(
                      product.startingPriceCents,
                      product.currencyCode,
                    )}
                  </>
                ) : null}
              </span>
            ),
          },
          ...(product.verification
            ? ([
                {
                  label: "Verified",
                  value: formatBoolean(product.verification.isVerified),
                },
                {
                  label: "Verified At",
                  value: product.verification.verifiedAt
                    ? formatDate(product.verification.verifiedAt)
                    : placeholder(),
                },
                {
                  label: "Domain",
                  value: (() => {
                    try {
                      return new URL(product.websiteUrl).hostname
                    } catch {
                      return product.websiteUrl
                    }
                  })(),
                },
                !product.verification.isVerified
                  ? {
                      label: "Verify Domain",
                      value: (
                        <div className="flex items-center gap-2">
                          <CopyButton
                            text={product.verification!.verificationTxt}
                            label="Copy TXT"
                          />
                          <VerifyDomainButton productId={product.id} />
                        </div>
                      ),
                    }
                  : null,
              ].filter(Boolean) as any)
            : []),
        ]}
        basePath="member/products"
        deletable={isOwner}
        editable={canManage}
        headingActionsLeft={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {canManage ? (
              <div className={radiantButtonWrapperClass}>
                <span className={radiantButtonGlowClass} />
                <Button
                  size="sm"
                  className="h-9 px-4 shadow-[0_16px_32px_-18px_rgba(7,78,134,0.5)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-16px_rgba(7,78,134,0.65)]"
                  asChild
                >
                  <Link href={insightsPath}>
                    <Sparkles className="mr-2 h-4 w-4" /> Explore Insights
                  </Link>
                </Button>
              </div>
            ) : null}
            {canManage && canViewAnalytics ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 border-[color:var(--brand-1)/0.45] text-[color:var(--brand-1)] hover:bg-[color:var(--brand-1)/0.08]"
                asChild
              >
                <Link href={analyticsPath}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Open Analytics
                </Link>
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-[color:var(--brand-1)] hover:bg-[color:var(--brand-1)/0.08]"
                asChild
              >
                <Link href={updatesPath}>
                  <Megaphone className="mr-2 h-4 w-4" /> Manage updates
                </Link>
              </Button>
            ) : null}
            <div className={radiantSecondaryWrapperClass}>
              <span className={radiantSecondaryGlowClass} />
              <ShareOnXButton
                path={publicPath}
                productName={product.name}
                tagline={product.tagline}
                variant="default"
                className="h-9 px-4 shadow-[0_12px_28px_-18px_rgba(29,155,240,0.6)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(29,155,240,0.65)]"
              />
            </div>
            <div className={actionGroupClass}>
              <ProductBadgeCelebrationTrigger />
            </div>
            {canManage ? (
              <ProductStatusMenu
                productId={product.id}
                status={product.status as any}
                triggerClassName="h-8 px-3"
              />
            ) : null}
          </div>
        }
        topRowExtras={[
          showPlanUI ? (
            <Card key="plan-top">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                {product.plan ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      {product.plan.name}
                      {product.plan.isDefault ? (
                        <Badge variant="outline">Default</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(product.plan.price) as any}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No plan currently attached.
                  </p>
                )}
                {product.plan && exclusiveCurrentTop.length ? (
                  <div className={dashedCalloutClass}>
                    <div className="text-xs font-semibold text-foreground">
                      Included only in {product.plan.name}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {exclusiveCurrentTop.map((f) => (
                        <li key={f.id}>• {f.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(() => {
                  const np = nextPlan
                  if (!np) return null
                  const pricing = getPlanPricing(np)
                  return (
                    <div className={calloutPanelClass}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Unlock more with {np.name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-baseline gap-2">
                            {pricing.original ? (
                              <span className="text-xs text-muted-foreground line-through">
                                {pricing.original}
                              </span>
                            ) : null}
                            <span className="text-2xl font-semibold text-foreground">
                              {pricing.priceText}
                            </span>
                            {pricing.pct > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                Save {percentFormatter.format(pricing.pct)}%
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Activation is instant. Boost lasts{" "}
                            {np.boostForDays ?? 1} day(s).
                          </p>
                          {np.description ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {np.description}
                            </p>
                          ) : null}
                        </div>
                        <form action={choosePlan} className="flex-shrink-0">
                          <input type="hidden" name="planId" value={np.id} />
                          <Button variant="outline" size="sm">
                            Buy now
                          </Button>
                        </form>
                      </div>
                      {deltaTop.length ? (
                        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">
                            You also get
                          </div>
                          <ul className="space-y-1">
                            {deltaTop.map((f) => (
                              <li key={f.id}>+ {f.name}</li>
                            ))}
                          </ul>
                          {deltaCount > deltaTop.length ? (
                            <div>
                              …and {deltaCount - deltaTop.length} more benefits
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {alternatePlanSummaries.length ? (
                        <details className="mt-4 rounded-md border border-dashed border-slate-200 bg-white/70 text-sm">
                          <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            Prefer a different upgrade?
                          </summary>
                          <div className="max-h-72 space-y-2 overflow-auto px-3 pb-3 pt-1">
                            {alternatePlanSummaries.map(
                              ({ plan, topHighlights, highlightCount }) => {
                                const planPricing = getPlanPricing(plan)
                                const isTopTier = plan.id === topPlanId
                                return (
                                  <form
                                    key={plan.id}
                                    action={choosePlan}
                                    className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <input
                                      type="hidden"
                                      name="planId"
                                      value={plan.id}
                                    />
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                        {plan.name}
                                        {isTopTier ? (
                                          <Badge variant="secondary">
                                            Top tier
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                                        {planPricing.original ? (
                                          <span className="line-through">
                                            {planPricing.original}
                                          </span>
                                        ) : null}
                                        <span className="text-sm font-semibold text-foreground">
                                          {planPricing.priceText}
                                        </span>
                                        {planPricing.pct > 0 ? (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                            Save{" "}
                                            {percentFormatter.format(
                                              planPricing.pct,
                                            )}
                                            %
                                          </span>
                                        ) : null}
                                      </div>
                                      {topHighlights.length ? (
                                        <ul className="space-y-1 text-xs text-muted-foreground">
                                          {topHighlights.map((feature) => (
                                            <li key={feature.id}>
                                              + {feature.name}
                                            </li>
                                          ))}
                                          {highlightCount >
                                          topHighlights.length ? (
                                            <li key="more">
                                              …and{" "}
                                              {highlightCount -
                                                topHighlights.length}{" "}
                                              more benefits
                                            </li>
                                          ) : null}
                                        </ul>
                                      ) : null}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="self-start sm:self-center"
                                    >
                                      Choose plan
                                    </Button>
                                  </form>
                                )
                              },
                            )}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ) : null,
        ]}
        relationships={
          <div className="grid grid-cols-12 gap-6">
            <Card className="col-span-12 md:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">Media Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-muted-foreground">
                    {`Images: ${(product.ProductMedia || []).length}/6`}
                  </div>
                  <div className="text-muted-foreground">
                    Tips: 3–6 screenshots (1280×720). Banner 1200×628.
                  </div>
                </div>
                <ProductMediaManager
                  productId={product.id}
                  media={
                    product.ProductMedia?.map(
                      (
                        m: NonNullable<typeof product.ProductMedia>[number],
                      ) => ({
                        id: m.id,
                        imageUrl: m.imageUrl,
                      }),
                    ) ?? []
                  }
                  canEdit={canManage}
                  max={6}
                />
              </CardContent>
            </Card>
            <div className="col-span-12 md:col-span-4">
              <PerformanceCard
                upvotes={product.analytics?.upvotes ?? 0}
                upvoters={upvoters as any}
                badges={(product.ProductBadge || []) as any}
                productName={product.name}
                tagline={product.tagline}
                hasBanner={Boolean(product.bannerImage)}
                ogImageUrl={product.bannerImage || product.logo}
                editHref={memberProductEditPath(product.slug)}
                reviewAverage={
                  reviewSummary.totalReviews
                    ? reviewSummary.averageRating
                    : null
                }
                reviewCount={reviewSummary.totalReviews}
                recentReviews={reviewSummary.reviews
                  .slice(0, 3)
                  .map((review) => ({
                    id: review.id,
                    rating: review.rating,
                    message: review.message,
                    createdAt:
                      review.createdAt instanceof Date
                        ? review.createdAt.toISOString()
                        : new Date(review.createdAt).toISOString(),
                    reviewer: reviewerDisplayName(
                      review.user.firstName,
                      review.user.lastName,
                    ),
                  }))}
              />
            </div>
            <Card className="col-span-12 md:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Branding</CardTitle>
              </CardHeader>
              <CardContent>
                <OverviewRow label="Slug" value={slugFmt(product.slug)} />
                <OverviewRow label="Tagline" value={product.tagline} />
                <OverviewRow
                  label="Logo"
                  value={image(product.logo, product.name, 64, 64)}
                />
              </CardContent>
            </Card>
            <Card className="col-span-12 md:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">
                  Organization & Targeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <span className={sectionLabelClass}>Organization</span>
                  {organizationName ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={infoChipClass}>
                        <Building2 className={chipIconClass} />
                        {organizationName}
                      </span>
                      {organizationUrl ? (
                        <Link
                          href={organizationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={accentChipClass}
                        >
                          <Globe className={chipIconClass} />
                          <span className="truncate max-w-[12rem]">
                            {organizationHost ?? organizationUrl}
                          </span>
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>
                      {placeholder()}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>Platforms</span>
                  {platforms.length ? (
                    <div className="flex flex-wrap gap-2">
                      {platforms.map((platform: string) => (
                        <span className={infoChipClass} key={platform}>
                          <Target className={chipIconClass} />
                          {platform}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>
                      {placeholder()}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>Keywords</span>
                  {tags.length ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tagValue: string) => (
                        <span className={accentChipClass} key={tagValue}>
                          <Tag className={chipIconClass} />
                          {tagValue}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>
                      {placeholder()}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>Alternative to</span>
                  {alternativesList.length ? (
                    <div className="flex flex-col gap-2">
                      {alternativesList.map((alternative: any) => {
                        const href = alternative.websiteUrl
                        const content = (
                          <span className="flex items-center gap-2">
                            <Sparkles className={chipIconClass} />
                            <span className="font-medium">
                              {alternative.name}
                            </span>
                            {href ? (
                              <span className="text-xs text-muted-foreground">
                                {formatHost(href) ?? href}
                              </span>
                            ) : null}
                          </span>
                        )
                        return href ? (
                          <Link
                            key={alternative.id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                          >
                            {content}
                          </Link>
                        ) : (
                          <span
                            key={alternative.id}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                          >
                            {content}
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>
                      {placeholder()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-12 md:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <span className={sectionLabelClass}>Website</span>
                  {product.websiteUrl ? (
                    <div className="space-y-1">
                      <Link
                        href={product.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${accentChipClass} max-w-full`}
                      >
                        <span className="truncate max-w-[18rem]">
                          {websiteHost}
                        </span>
                      </Link>
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>
                      {placeholder()}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>Primary CTA</span>
                  {hasCtaPair ? (
                    <div className="space-y-1">
                      <span className={infoChipClass}>
                        <MousePointerClick className={chipIconClass} /> CTA
                        label
                      </span>
                      <Link
                        href={ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${accentChipClass} max-w-full`}
                      >
                        <span className="truncate max-w-[18rem]">
                          {ctaHost ?? ctaUrl}
                        </span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className={placeholderTextClass}>
                        {placeholder()}
                      </span>
                      {(ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl) ? (
                        <p className="text-xs text-destructive">
                          Tip: Provide both CTA label and URL for a complete
                          call-to-action.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <span className={sectionLabelClass}>Additional Links</span>
                  {extraLinks.length ? (
                    <div className="flex flex-wrap gap-2">
                      {extraLinks.map(({ key, href, label, icon }) => {
                        const isExternal = href.startsWith("http")
                        const content = (
                          <>
                            {icon}
                            <span className="truncate max-w-[12rem]">
                              {label}
                            </span>
                          </>
                        )
                        return isExternal ? (
                          <Link
                            key={key}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${accentChipClass} max-w-full`}
                          >
                            {content}
                          </Link>
                        ) : (
                          <a
                            key={key}
                            href={href}
                            className={`${accentChipClass} max-w-full`}
                          >
                            {content}
                          </a>
                        )
                      })}
                    </div>
                  ) : (
                    <span className={placeholderTextClass}>
                      {placeholder()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-12">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  {(() => {
                    const len = (product.description || "").trim().length
                    const good = len >= 200
                    return (
                      <div>
                        Quality:{" "}
                        <span
                          className={
                            good ? "text-emerald-600" : "text-amber-600"
                          }
                        >
                          {good ? "Good" : "Needs work"}
                        </span>{" "}
                        ({len} chars)
                      </div>
                    )
                  })()}
                  <Link
                    href={memberProductEditPath(product.slug)}
                    className="text-xs text-primary hover:underline"
                  >
                    Improve description
                  </Link>
                </div>
                <div className="prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {product.description}
                  </ReactMarkdown>
                </div>
                <OverviewRow
                  label="Published At"
                  value={
                    product.publishedAt
                      ? formatDate(product.publishedAt)
                      : placeholder()
                  }
                />
              </CardContent>
            </Card>
          </div>
        }
      />
    </>
  )
}
