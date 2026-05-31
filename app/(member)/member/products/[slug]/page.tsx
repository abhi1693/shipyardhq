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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"
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
import {
  getProductById,
  setProductStatusAction,
} from "@/actions/admin/products/actions"
import { requireManageableProduct } from "@/lib/server/productAccess"
import CopyButton from "@/components/molecules/CopyButton"
import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  choosePlanAction,
  validatePaymentAndAttachPlan,
  validateSubscriptionAndAttachPlan,
} from "@/actions/member/products/actions"
import {
  memberProductAnalyticsPath,
  memberProductDeletePath,
  memberProductEditPath,
  memberProductPath,
  memberProductUpgradePath,
  productPath,
} from "@/lib/routes"
import {
  CheckCircle2,
  Circle,
  Github as GithubIcon,
  LockKeyhole,
  Mail,
  Twitter as TwitterIcon,
  Video,
} from "lucide-react"
import PerformanceCard from "@/components/molecules/PerformanceCard"
import { getPublicPlans } from "@/actions/public/plans/actions"
// startPlanCheckoutAction and setProductPlanAction are used inside choosePlanAction
import { hasPlanFeature } from "@/lib/features"
import { resolveProductAnalyticsAccess } from "@/lib/server/analytics/productAnalytics"
import PurchasePlanToast from "@/components/molecules/PurchasePlanToast"
import ProductBadgeCelebrationGate from "@/components/molecules/ProductBadgeCelebrationGate"
import { JSX } from "react"
import { getRecentProductUpvoters } from "@/lib/server/productUpvotes"
import MemberProductHeaderActions from "@/components/molecules/MemberProductHeaderActions"

const chipIconClass = "h-3.5 w-3.5 text-muted-foreground"
const dashedCalloutClass =
  "rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3"

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
  const subscriptionId = (sp["subscription_id"] as string) || ""
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
  if (subscriptionId) {
    await validateSubscriptionAndAttachPlan(subscriptionId)
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
  const publicPath = productPath(productSlug)
  const analyticsPath = memberProductAnalyticsPath(productSlug)
  const editPath = memberProductEditPath(productSlug)
  const { hasBasicAnalytics } = resolveProductAnalyticsAccess({
    plan: product.plan,
    featureEntitlements: product.featureEntitlements ?? [],
  })
  const canViewAnalytics = hasBasicAnalytics
  const upvoters = await getRecentProductUpvoters(productId, 8).catch(() => [])
  const isFreePlan = !product.plan || product.plan.isDefault

  const allPlans = await getPublicPlans().catch(() => [])
  const currentPlanPublic = allPlans.find((p) => p.id === product.plan?.id)
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
    if (currentPlanPublic) {
      return typeFilteredPlans.filter(
        (plan) => (plan.price ?? 0) > (currentPlanPublic.price ?? 0),
      )
    }
    const paidPlans = typeFilteredPlans.filter((plan) => (plan.price ?? 0) > 0)
    return paidPlans.length ? paidPlans : typeFilteredPlans
  })()
  const nextPlan = upgradeCandidates[0]
  const nextPlanNewBenefits = nextPlan
    ? nextPlan.features
        .filter((feature) => feature.enabled)
        .filter((feature) => !hasPlanFeature(product.plan ?? null, feature.key))
    : []
  const nextPlanHighlights = nextPlanNewBenefits
    .slice(0, 3)
    .map((feature) => ({ id: feature.id, name: feature.name }))
  const nextPlanHighlightCount = nextPlanNewBenefits.length
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

  const choosePlan = choosePlanAction.bind(null, {
    productId,
    redirectPath: memberProductPath(productSlug),
  })
  const upgradePath = memberProductUpgradePath(productSlug)
  const boostAssignedAt = product.planAssignedAt
  const boostDays = product.plan?.boostForDays ?? 0
  const statusChangeUnlockAt =
    !isFreePlan && boostAssignedAt && boostDays > 0
      ? boostAssignedAt.getTime() + boostDays * 24 * 60 * 60 * 1000
      : null

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
  const websiteHost = formatHost(product.websiteUrl) ?? product.websiteUrl
  const metadata = product.metadata

  const extraLinks: Array<{
    key: string
    label: string
    href: string
    icon: JSX.Element
  }> = []

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
    metadata?.demoUrl ||
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
      note: socialsReady ? "Nice." : "GitHub, X, demo, or email",
      complete: socialsReady,
      href: `${editPath}#section-details`,
    },
    {
      key: "publish",
      label: "Publish your listing",
      note:
        product.status === "published"
          ? "Live"
          : "Use Publish in the header when ready",
      complete: product.status === "published",
    },
  ]
  const checklistCompleted = listingChecklistItems.filter(
    (i) => i.complete,
  ).length
  const checklistTotal = listingChecklistItems.length
  const checklistPct = checklistTotal
    ? Math.round((checklistCompleted / checklistTotal) * 100)
    : 0
  const nextChecklistAction = listingChecklistItems.find(
    (item) => !item.complete && item.href,
  )
  const nextChecklistLabel =
    nextChecklistAction?.label ??
    (product.status !== "published" ? "Publish your listing" : null)
  const nextChecklistHref = nextChecklistAction?.href ?? null

  const upvoteCount = product.analytics?.upvotes ?? 0
  const publishPrereqsComplete = listingChecklistItems
    .filter((item) => item.key !== "publish")
    .every((item) => item.complete)

  const publishAndBoost = async (formData: FormData) => {
    "use server"
    const result = await setProductStatusAction(productId, "published")
    if (result && typeof result === "object" && "error" in result) {
      redirect(`${memberProductPath(productSlug)}?error=publish_failed`)
    }
    await choosePlanAction(
      { productId, redirectPath: memberProductPath(productSlug) },
      formData,
    )
  }

  const boostMode =
    product.status !== "published"
      ? publishPrereqsComplete
        ? "publish_and_boost"
        : "finish_setup"
      : "boost"
  const boostCardTitle =
    product.status !== "published"
      ? publishPrereqsComplete
        ? "Ready to launch — boost your debut"
        : "Boost once you're live"
      : upvoteCount === 0
        ? "Want more impressions? Boost to get featured"
        : "Want more visibility? Boost your listing"
  const boostCtaLabel =
    boostMode === "publish_and_boost"
      ? "Publish + boost"
      : boostMode === "finish_setup"
        ? "Finish setup to boost"
        : upvoteCount === 0
          ? "Boost to get featured"
          : "Boost listing"
  const boostCtaHint =
    boostMode === "publish_and_boost"
      ? "We’ll publish your listing and start checkout."
      : boostMode === "finish_setup"
        ? "Boosts start after you publish."
        : null
  const boostTimingText =
    product.status === "published"
      ? "Starts immediately"
      : "Starts after publish"
  const boostFormAction =
    boostMode === "publish_and_boost" ? publishAndBoost : choosePlan
  const boostSetupHref = nextChecklistHref ?? editPath

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
          subtitle: product.tagline,
        }}
        overview={[
          {
            label: "Readiness",
            value: (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {checklistCompleted}/{checklistTotal} complete
                  </span>
                  <span className="font-medium text-foreground">
                    {checklistPct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${checklistPct}%` }}
                  />
                </div>
                {nextChecklistLabel ? (
                  <div className="text-xs text-muted-foreground">
                    Next:{" "}
                    {nextChecklistHref ? (
                      <Link
                        href={nextChecklistHref}
                        className="text-primary hover:underline"
                      >
                        {nextChecklistLabel}
                      </Link>
                    ) : (
                      <span className="text-foreground">
                        {nextChecklistLabel}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            ),
          },
          { label: "Category", value: product.category.name },
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
              ] as const)
            : []),
        ]}
        basePath="member/products"
        deletable={false}
        editable={false}
        headingActionsLeft={
          <MemberProductHeaderActions
            productId={product.id}
            status={product.status as any}
            canChangeStatus={isFreePlan}
            statusChangeUnlockAt={statusChangeUnlockAt}
            publicPath={publicPath}
            editPath={editPath}
            analyticsPath={analyticsPath}
            canViewAnalytics={canViewAnalytics}
            upgradePath={upgradePath}
            deletePath={memberProductDeletePath(product.slug)}
            canDelete={isOwner}
          />
        }
        topRowExtras={[
          nextPlan ? (
            <Card key="boost-upsell">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">{boostCardTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Recommended boost
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {nextPlan.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Featured for {nextPlan.boostForDays ?? 1} day(s) •{" "}
                      {boostTimingText}
                    </div>
                  </div>
                  {(() => {
                    const pricing = getPlanPricing(nextPlan)
                    return (
                      <div className="text-right">
                        {pricing.original ? (
                          <div className="text-xs text-muted-foreground line-through">
                            {pricing.original}
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                        <div className="text-2xl font-semibold text-foreground">
                          {pricing.priceText}
                        </div>
                        {pricing.pct > 0 ? (
                          <div className="mt-1 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Save {percentFormatter.format(pricing.pct)}%
                          </div>
                        ) : null}
                      </div>
                    )
                  })()}
                </div>

                {nextPlanHighlights.length ? (
                  <div className={dashedCalloutClass}>
                    <div className="text-xs font-semibold text-foreground">
                      You&apos;ll unlock
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {nextPlanHighlights.map((f) => (
                        <li key={f.id}>+ {f.name}</li>
                      ))}
                      {nextPlanHighlightCount > nextPlanHighlights.length ? (
                        <li key="more">
                          …and{" "}
                          {nextPlanHighlightCount - nextPlanHighlights.length}{" "}
                          more benefits
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : nextPlan.description ? (
                  <p className="text-xs text-muted-foreground">
                    {nextPlan.description}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    {boostMode === "finish_setup" ? (
                      <Button size="sm" className="h-9 px-4" asChild>
                        <Link href={boostSetupHref}>{boostCtaLabel}</Link>
                      </Button>
                    ) : (
                      <form action={boostFormAction}>
                        <input
                          type="hidden"
                          name="planId"
                          value={nextPlan.id}
                        />
                        <Button size="sm" className="h-9 px-4">
                          {boostCtaLabel}
                        </Button>
                      </form>
                    )}
                    <Link
                      href={upgradePath}
                      className="text-xs text-primary hover:underline"
                    >
                      Compare boosts
                    </Link>
                  </div>
                  {boostCtaHint ? (
                    <div className="text-xs text-muted-foreground">
                      {boostCtaHint}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Current:{" "}
                    <span className="font-medium text-foreground">
                      {product.plan?.name ?? "Free"}
                    </span>
                  </span>
                  {isFreePlan ? <Badge variant="secondary">Free</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ) : null,
        ]}
        relationships={
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4 md:order-2 space-y-6">
              <PerformanceCard
                upvotes={product.analytics?.upvotes ?? 0}
                upvoters={upvoters as any}
                badges={(product.ProductBadge || []) as any}
                productName={product.name}
                tagline={product.tagline}
                hasBanner={Boolean(product.bannerImage)}
                ogImageUrl={product.bannerImage || product.logo}
                editHref={editPath}
              />
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base">Launch checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {checklistCompleted}/{checklistTotal} complete
                    </span>
                    {nextChecklistLabel ? (
                      nextChecklistHref ? (
                        <Link
                          href={nextChecklistHref}
                          className="text-primary hover:underline"
                        >
                          Focus: {nextChecklistLabel}
                        </Link>
                      ) : (
                        <span className="text-foreground">
                          Focus: {nextChecklistLabel}
                        </span>
                      )
                    ) : (
                      <span className="text-foreground">All set</span>
                    )}
                  </div>

                  <ul className="space-y-1">
                    {listingChecklistItems.map((item) => {
                      const icon = item.complete ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      )

                      const body = (
                        <>
                          {icon}
                          <div className="flex-1">
                            <div className="text-sm text-foreground">
                              {item.label}
                            </div>
                            {item.note ? (
                              <div className="text-xs text-muted-foreground">
                                {item.note}
                              </div>
                            ) : null}
                          </div>
                          {!item.complete ? (
                            <span className="mt-0.5 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                              Fix
                            </span>
                          ) : null}
                        </>
                      )

                      return (
                        <li key={item.key}>
                          {item.href ? (
                            <Link
                              href={item.href}
                              className="group flex items-start gap-2 rounded-md px-2 py-2 transition hover:bg-slate-50"
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className="flex items-start gap-2 rounded-md px-2 py-2">
                              {icon}
                              <div className="flex-1">
                                <div className="text-sm text-foreground">
                                  {item.label}
                                </div>
                                {item.note ? (
                                  <div className="text-xs text-muted-foreground">
                                    {item.note}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  <div className={dashedCalloutClass}>
                    <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        {canViewAnalytics ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        ) : (
                          <LockKeyhole className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="space-y-0.5">
                          <div className="font-medium text-foreground">
                            Analytics
                          </div>
                          <div>
                            {canViewAnalytics
                              ? "Open analytics for this product."
                              : "Locked on free. Unlock with a boost."}
                          </div>
                        </div>
                      </div>
                      <Link
                        href={canViewAnalytics ? analyticsPath : upgradePath}
                        className="mt-0.5 shrink-0 text-primary hover:underline"
                      >
                        {canViewAnalytics ? "Open" : "Unlock"}
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="col-span-12 md:col-span-8 md:order-1">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Listing details</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="branding" className="px-6">
                    <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                      <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-semibold text-slate-900">
                            Branding
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            Slug, logo, banner, and screenshots.
                          </span>
                        </div>
                        <div className="pt-0.5 shrink-0">
                          <Badge variant="outline">
                            {galleryCount}/6 screenshots
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <OverviewRow
                          label="Slug"
                          value={slugFmt(product.slug)}
                        />
                        <OverviewRow
                          label="Logo"
                          value={image(product.logo, product.name, 64, 64)}
                        />
                        <OverviewRow
                          label="Banner"
                          value={
                            product.bannerImage ? (
                              image(
                                product.bannerImage,
                                `${product.name} banner`,
                                240,
                                126,
                              )
                            ) : (
                              <Link
                                href={`${editPath}#section-media`}
                                className="text-xs text-primary hover:underline"
                              >
                                Add banner
                              </Link>
                            )
                          }
                        />
                        <OverviewRow
                          label="Screenshots"
                          value={
                            <span className="text-sm text-muted-foreground">
                              {galleryCount}/6
                            </span>
                          }
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="targeting" className="px-6">
                    <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                      <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-semibold text-slate-900">
                            Targeting
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            Platforms, keywords, and alternatives.
                          </span>
                        </div>
                        <div className="pt-0.5 shrink-0">
                          <Badge variant="outline">
                            {tags.length} keywords
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <OverviewRow
                          label="Platforms"
                          value={
                            platforms.length ? (
                              <span className="text-sm text-muted-foreground">
                                {platforms.join(", ")}
                              </span>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                {placeholder()}
                                <Link
                                  href={`${editPath}#section-core`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Add
                                </Link>
                              </div>
                            )
                          }
                        />
                        <OverviewRow
                          label="Keywords"
                          value={
                            tags.length ? (
                              <span className="text-sm text-muted-foreground">
                                {tags.join(", ")}
                              </span>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                {placeholder()}
                                <Link
                                  href={`${editPath}#section-core`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Add
                                </Link>
                              </div>
                            )
                          }
                        />
                        <OverviewRow
                          label="Alternative to"
                          value={
                            alternativesList.length ? (
                              <ul className="space-y-1">
                                {alternativesList.map((alternative: any) => {
                                  const href = alternative.websiteUrl
                                  return (
                                    <li
                                      key={alternative.id}
                                      className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2"
                                    >
                                      {href ? (
                                        <Link
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline"
                                        >
                                          {alternative.name}
                                        </Link>
                                      ) : (
                                        <span className="text-sm text-foreground">
                                          {alternative.name}
                                        </span>
                                      )}
                                      {href ? (
                                        <span className="text-xs text-muted-foreground">
                                          {formatHost(href) ?? href}
                                        </span>
                                      ) : null}
                                    </li>
                                  )
                                })}
                              </ul>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                {placeholder()}
                                <Link
                                  href={`${editPath}#section-details`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Add
                                </Link>
                              </div>
                            )
                          }
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="links" className="px-6">
                    <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                      <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-semibold text-slate-900">
                            Links
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            Website and additional links.
                          </span>
                        </div>
                        <div className="pt-0.5 shrink-0">
                          <Badge variant="outline">
                            {extraLinks.length} extra
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <OverviewRow
                          label="Website"
                          value={
                            <Link
                              href={product.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {websiteHost}
                            </Link>
                          }
                        />
                        <OverviewRow
                          label="Additional links"
                          value={
                            extraLinks.length ? (
                              <ul className="space-y-2">
                                {extraLinks.map(
                                  ({ key, href, label, icon }) => {
                                    const isExternal = href.startsWith("http")
                                    const linkClassName =
                                      "inline-flex max-w-full items-center gap-2 text-sm text-primary hover:underline"
                                    return (
                                      <li key={key}>
                                        {isExternal ? (
                                          <Link
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={linkClassName}
                                          >
                                            {icon}
                                            <span className="truncate max-w-[16rem]">
                                              {label}
                                            </span>
                                          </Link>
                                        ) : (
                                          <a
                                            href={href}
                                            className={linkClassName}
                                          >
                                            {icon}
                                            <span className="truncate max-w-[16rem]">
                                              {label}
                                            </span>
                                          </a>
                                        )}
                                      </li>
                                    )
                                  },
                                )}
                              </ul>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                {placeholder()}
                                <Link
                                  href={`${editPath}#section-details`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Add
                                </Link>
                              </div>
                            )
                          }
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {product.verification ? (
                    <AccordionItem value="verification" className="px-6">
                      <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                        <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="font-semibold text-slate-900">
                              Verification
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                              Verify your domain ownership via DNS.
                            </span>
                          </div>
                          <div className="pt-0.5 shrink-0">
                            <Badge
                              variant={
                                product.verification.isVerified
                                  ? "success"
                                  : "outline"
                              }
                            >
                              {product.verification.isVerified
                                ? "Verified"
                                : "Unverified"}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-6">
                        <div className="space-y-4 text-sm text-muted-foreground">
                          <OverviewRow
                            label="Domain"
                            value={
                              <span className="text-sm text-muted-foreground">
                                {websiteHost}
                              </span>
                            }
                          />
                          <OverviewRow
                            label="TXT record"
                            value={
                              <div className="flex flex-wrap items-center gap-2">
                                <code className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                                  {product.verification.verificationTxt}
                                </code>
                                <CopyButton
                                  text={product.verification.verificationTxt}
                                  label="Copy TXT"
                                  size="sm"
                                />
                              </div>
                            }
                          />
                          <OverviewRow
                            label="Verified at"
                            value={
                              product.verification.verifiedAt
                                ? formatDate(product.verification.verifiedAt)
                                : placeholder()
                            }
                          />
                          <div className={dashedCalloutClass}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-xs text-muted-foreground">
                                Add the TXT record to your DNS, then click
                                verify.
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
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ) : null}

                  <AccordionItem value="description" className="px-6">
                    <AccordionTrigger className="-mx-6 gap-2 rounded-lg px-6 text-base hover:no-underline group">
                      <div className="flex flex-1 min-w-0 items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-semibold text-slate-900">
                            Description
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            Your main pitch (Markdown supported).
                          </span>
                        </div>
                        <div className="pt-0.5 shrink-0">
                          <Badge
                            variant={descriptionReady ? "success" : "secondary"}
                          >
                            {descriptionReady ? "Good" : "Needs work"}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6">
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            Quality:{" "}
                            <span
                              className={
                                descriptionReady
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }
                            >
                              {descriptionReady ? "Good" : "Needs work"}
                            </span>{" "}
                            ({descriptionLength} chars)
                          </div>
                          <Link
                            href={`${editPath}#section-core`}
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
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        }
      />
    </>
  )
}
