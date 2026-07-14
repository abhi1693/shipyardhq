"use client"

import { type KeyboardEvent, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import type { PublicPlan } from "@/actions/public/plans/actions"
import { createBillingPortalAction } from "@/actions/member/billing/portal"
import { choosePlanAction } from "@/actions/member/products/actions"
import { Button } from "@/components/atoms/button"
import ProductBadgeCelebrationDialog from "@/components/molecules/ProductBadgeCelebrationDialog"
import {
  getPricingOfferPresentation,
  resolveInitialPricingPlanType,
  resolveRecommendedPlanId,
  selectPricingOfferPlans,
} from "@/lib/pricing/offer"
import { cn } from "@/lib/utils"

type PlanType = PublicPlan["type"]
type ProductUpgradeProductStatus = "draft" | "published" | "archived"

export type ProductUpgradePerformanceSnapshot = {
  siteVisitors: number
  sitePageViews: number
  productVisitors: number
  productPageViews: number
  productUpvotes: number
}

export type ProductUpgradePlanStatus = {
  hasActiveSubscription: boolean
  assignedAt: string | null
  boostEndsAt: string | null
}

const PLAN_TYPE_OPTIONS: { value: PlanType; label: string }[] = [
  { value: "one_time_price" as PlanType, label: "One-time launch boost" },
  {
    value: "recurring_price" as PlanType,
    label: "Keep my placement running",
  },
]

const EMPTY_PERFORMANCE_SNAPSHOT: ProductUpgradePerformanceSnapshot = {
  siteVisitors: 0,
  sitePageViews: 0,
  productVisitors: 0,
  productPageViews: 0,
  productUpvotes: 0,
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

function formatCompactCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(Math.max(0, Math.round(value)))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function planRank(plan: PublicPlan) {
  if ((plan.price || 0) === 0) return 0
  if (/pro|enterprise|max/i.test(plan.name)) return 2
  return 1
}

function isPaidPlan(plan?: PublicPlan | null) {
  return Boolean(plan && !plan.isDefault && (plan.price || 0) > 0)
}

function planExposureShare(rank: number) {
  if (rank === 2) return 0.28
  if (rank === 1) return 0.11
  return 0.02
}

function productDemandSignal(snapshot: ProductUpgradePerformanceSnapshot) {
  const productVisitors =
    snapshot.productVisitors || Math.round(snapshot.productPageViews * 0.65)

  return productVisitors + snapshot.productUpvotes * 12
}

function siteAudienceSignal(snapshot: ProductUpgradePerformanceSnapshot) {
  return snapshot.siteVisitors || Math.round(snapshot.sitePageViews * 0.65)
}

function planMetrics(
  plan: PublicPlan,
  snapshot: ProductUpgradePerformanceSnapshot,
  comparisonPlans: PublicPlan[],
) {
  const rank = planRank(plan)
  const siteAudience = siteAudienceSignal(snapshot)
  const productDemand = productDemandSignal(snapshot)
  const planLoad = Math.max(1, plan.productCount || 0)
  const exposedAudience = Math.round(
    (siteAudience * planExposureShare(rank)) / Math.sqrt(planLoad),
  )
  const demandMultiplier = rank === 2 ? 2.2 : rank === 1 ? 1.45 : 1
  const estimatedReach = Math.max(
    Math.round(productDemand * demandMultiplier),
    exposedAudience,
  )
  const hasMeasuredData = siteAudience > 0 || productDemand > 0
  const score = hasMeasuredData
    ? Math.round(
        clamp(
          siteAudience > 0
            ? (estimatedReach / siteAudience) * 100 + rank * 12
            : 18 + rank * 22,
          rank === 0 ? 4 : 18,
          rank === 2 ? 96 : rank === 1 ? 72 : 32,
        ),
      )
    : rank > 0
      ? 15
      : 0
  const offerFeatures = getPricingOfferPresentation(plan, comparisonPlans)
    .items.map((item) => item.label)
    .slice(0, 4)

  if (rank === 0) {
    return {
      score,
      reach: formatCompactCount(estimatedReach),
      label: "Standard Review",
      features: offerFeatures,
    }
  }
  if (rank === 2) {
    return {
      score,
      reach: formatCompactCount(estimatedReach),
      label: "Pro Acceleration",
      features: offerFeatures,
    }
  }
  return {
    score,
    reach: formatCompactCount(estimatedReach),
    label: "Featured Injection",
    features: offerFeatures,
  }
}

function getPlanSubtitle(plan: PublicPlan) {
  if ((plan.price || 0) === 0) return "Free forever"
  if (plan.type === "recurring_price") {
    return (plan as any).priceSuffix
      ? String((plan as any).priceSuffix)
      : "Subscription"
  }
  return "One-time payment"
}

function formatDateLabel(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function ProductUpgradeProvisioning({
  plans,
  productId,
  redirectPath,
  errorRedirectPath,
  currentPlanId,
  currentPlan,
  productStatus,
  preferFreePlan = false,
  lockedPlanType,
  subscriptionLocked = false,
  currentPlanStatus = {
    hasActiveSubscription: false,
    assignedAt: null,
    boostEndsAt: null,
  },
  productPublicPath,
  performanceSnapshot = EMPTY_PERFORMANCE_SNAPSHOT,
}: {
  plans: PublicPlan[]
  productId: string
  redirectPath: string
  errorRedirectPath?: string
  currentPlanId?: string | null
  currentPlan?: PublicPlan | null
  productStatus?: ProductUpgradeProductStatus | null
  preferFreePlan?: boolean
  lockedPlanType?: PlanType | null
  subscriptionLocked?: boolean
  currentPlanStatus?: ProductUpgradePlanStatus
  productPublicPath?: string
  performanceSnapshot?: ProductUpgradePerformanceSnapshot
}) {
  const choosePlan = useMemo(
    () =>
      choosePlanAction.bind(null, {
        productId,
        redirectPath,
        errorRedirectPath,
      }),
    [productId, redirectPath, errorRedirectPath],
  )
  const searchParams = useSearchParams()
  const [isPortalPending, startPortal] = useTransition()
  const requestedPlanId = searchParams.get("planId")
  const requestedPlan = requestedPlanId
    ? plans.find((plan) => plan.id === requestedPlanId)
    : null
  const availableTypes = PLAN_TYPE_OPTIONS.filter((option) =>
    plans.some((plan) => plan.type === option.value && (plan.price || 0) > 0),
  )
  const [selectedType, setSelectedType] = useState<PlanType>(() => {
    if (lockedPlanType) return lockedPlanType
    if (requestedPlan && (requestedPlan.price || 0) > 0) {
      return requestedPlan.type
    }
    return resolveInitialPricingPlanType(plans)
  })
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false)
  const hasPaidPlanForSelectedType = plans.some(
    (plan) => (plan.price || 0) > 0 && plan.type === selectedType,
  )
  const effectiveSelectedType =
    !lockedPlanType && !hasPaidPlanForSelectedType && availableTypes[0]?.value
      ? availableTypes[0].value
      : selectedType

  const canonicalOfferPlans = selectPricingOfferPlans(
    plans,
    effectiveSelectedType,
  )
  const pinnedPlanIds = new Set(
    [currentPlanId, requestedPlanId].filter((planId): planId is string =>
      Boolean(planId),
    ),
  )
  const pinnedPlans = plans.filter(
    (plan) =>
      pinnedPlanIds.has(plan.id) &&
      ((plan.price || 0) === 0 || plan.type === effectiveSelectedType),
  )
  const visiblePlans =
    subscriptionLocked && currentPlanId
      ? plans.filter((plan) => plan.id === currentPlanId)
      : [
          ...new Map(
            [...canonicalOfferPlans, ...pinnedPlans].map((plan) => [
              plan.id,
              plan,
            ]),
          ).values(),
        ].sort((a, b) => {
          const rankDiff = planRank(a) - planRank(b)
          return rankDiff || (a.price || 0) - (b.price || 0)
        })
  const recommendedPlanId = resolveRecommendedPlanId(visiblePlans)

  const defaultSelected =
    visiblePlans.find((plan) => plan.id === requestedPlanId) ??
    visiblePlans.find((plan) => plan.id === currentPlanId) ??
    (preferFreePlan
      ? visiblePlans.find((plan) => planRank(plan) === 0)
      : visiblePlans.find((plan) => planRank(plan) === 1)) ??
    visiblePlans[0] ??
    null
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    defaultSelected?.id ?? null,
  )
  const effectiveSelectedPlanId =
    selectedPlanId && visiblePlans.some((plan) => plan.id === selectedPlanId)
      ? selectedPlanId
      : (defaultSelected?.id ?? null)

  const selectedPlan =
    visiblePlans.find((plan) => plan.id === effectiveSelectedPlanId) ??
    defaultSelected ??
    null
  const metrics = selectedPlan
    ? planMetrics(selectedPlan, performanceSnapshot, visiblePlans)
    : null
  const selectedIsCurrent = Boolean(
    selectedPlan && currentPlanId && selectedPlan.id === currentPlanId,
  )
  const productIsPublished = productStatus === "published"
  const showCurrentPlanNotice = selectedIsCurrent && productIsPublished
  const circumference = 2 * Math.PI * 45
  const score = metrics?.score ?? 0
  const gaugeOffset = circumference - (score / 100) * circumference
  const currentPaidPlan = isPaidPlan(currentPlan) ? currentPlan : null
  const currentPaidMetrics = currentPaidPlan
    ? planMetrics(currentPaidPlan, performanceSnapshot, plans)
    : null
  const currentPlanAssignedDate = formatDateLabel(currentPlanStatus.assignedAt)
  const currentBoostEndsDate = formatDateLabel(currentPlanStatus.boostEndsAt)

  function handleTypeChange(nextType: PlanType) {
    if (subscriptionLocked) return

    setSelectedType(nextType)
    const nextPlans = [
      ...plans.filter((plan) => (plan.price || 0) === 0),
      ...plans.filter(
        (plan) => (plan.price || 0) > 0 && plan.type === nextType,
      ),
    ].sort((a, b) => {
      const rankDiff = planRank(a) - planRank(b)
      return rankDiff || (a.price || 0) - (b.price || 0)
    })
    const preferred =
      nextPlans.find((plan) => plan.id === currentPlanId) ??
      nextPlans.find((plan) => planRank(plan) === 1) ??
      nextPlans[0] ??
      null
    setSelectedPlanId(preferred?.id ?? null)
  }

  function handlePlanKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    planId: string,
  ) {
    if (subscriptionLocked) return

    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    setSelectedPlanId(planId)
  }

  function openBillingPortal() {
    startPortal(async () => {
      const result = (await createBillingPortalAction()) as {
        link?: string
        error?: string
      }

      if (result.link) {
        window.location.href = result.link
        return
      }

      toast.error(result.error || "Unable to open billing portal")
    })
  }

  if (currentPaidPlan && currentPaidMetrics) {
    const isRecurring = currentPaidPlan.type === "recurring_price"
    const statusLabel = isRecurring ? "Subscription active" : "Boost active"
    const timingLabel = isRecurring
      ? currentPlanAssignedDate
        ? `Started ${currentPlanAssignedDate}`
        : "Managed through billing"
      : currentBoostEndsDate
        ? `Boost active through ${currentBoostEndsDate}`
        : currentPlanAssignedDate
          ? `Boost started ${currentPlanAssignedDate}`
          : "Boost window active"

    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#E2E8F0] bg-[#061d31] px-6 py-5 text-white md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Current plan
                </div>
                <h1 className="text-[28px] font-bold leading-9">
                  {currentPaidPlan.name} is active
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  Your product is already receiving paid placement. Plan changes
                  are only available while a product is on the free plan.
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left md:text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">
                  {statusLabel}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatPrice(currentPaidPlan.price || 0)}
                </div>
                <div className="text-xs text-white/60">
                  {getPlanSubtitle(currentPaidPlan)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_320px] md:p-8">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#f8f9ff] p-4">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#43474c]">
                    <CalendarClock className="size-4" aria-hidden="true" />
                    Active window
                  </div>
                  <div className="text-sm font-semibold text-[#0b1c30]">
                    {timingLabel}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#f8f9ff] p-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#43474c]">
                    Reach potential
                  </div>
                  <div className="text-sm font-semibold text-[#0b1c30]">
                    {currentPaidMetrics.score}% score ·{" "}
                    {currentPaidMetrics.reach} estimated reach
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#43474c]">
                  Included benefits
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {currentPaidMetrics.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0b1c30]"
                    >
                      <CheckCircle2
                        className="size-4 shrink-0 text-[#16a34a]"
                        aria-hidden="true"
                      />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-[#E2E8F0] bg-[#f8f9ff] p-5">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#16a34a]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#15803d]">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Paid plan active
                  </div>
                  <h2 className="text-xl font-bold text-[#0b1c30]">
                    No upgrade options
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#43474c]">
                    Plan changes are only available while this product is on the
                    free plan.
                  </p>
                </div>

                {currentPlanStatus.hasActiveSubscription ? (
                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl bg-[#00162a] text-[12px] font-bold uppercase tracking-widest text-white hover:bg-black"
                    disabled={isPortalPending}
                    onClick={openBillingPortal}
                  >
                    <CreditCard className="size-4" aria-hidden="true" />
                    {isPortalPending ? "Opening Portal" : "Manage Subscription"}
                  </Button>
                ) : null}

                <Button
                  asChild
                  variant="outline"
                  className="h-10 w-full rounded-xl text-[12px] font-bold uppercase tracking-widest"
                >
                  <Link href={redirectPath}>
                    <ExternalLink className="size-4" aria-hidden="true" />
                    View Product
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </section>

        <ProductBadgeCelebrationDialog
          open={badgeDialogOpen}
          onOpenChange={setBadgeDialogOpen}
          productPublicPath={productPublicPath}
        />
      </div>
    )
  }

  if (!plans.length || !selectedPlan || !metrics) {
    return (
      <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white px-6 py-10 text-center text-sm text-[#43474c]">
        Launch provisioning is not available yet.
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-10 xl:flex-row">
        <section className="flex-1 space-y-4">
          {availableTypes.length > 1 &&
          !lockedPlanType &&
          !subscriptionLocked ? (
            <div className="mb-6 flex w-fit rounded-lg bg-[#eff4ff] p-1">
              {availableTypes.map((option) => {
                const active = effectiveSelectedType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "rounded-md px-6 py-2 text-[12px] font-bold uppercase tracking-[0.05em] transition-colors",
                      active
                        ? "bg-white text-[#00162a] shadow-sm"
                        : "text-[#43474c] hover:text-[#00162a]",
                    )}
                    onClick={() => handleTypeChange(option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          {visiblePlans.map((plan) => {
            const selected = selectedPlan.id === plan.id
            const current = currentPlanId === plan.id
            const rank = planRank(plan)
            const recommended =
              plan.id === recommendedPlanId && (plan.price || 0) > 0
            const planCopy = planMetrics(
              plan,
              performanceSnapshot,
              visiblePlans,
            )
            return (
              <div
                key={plan.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "group relative block w-full rounded-xl border bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08)]",
                  selected
                    ? rank === 2
                      ? "border-[#061d31] bg-[#061d31] text-white"
                      : "border-2 border-[#0051d5]"
                    : "border-[#E2E8F0]",
                )}
                onKeyDown={(event) => handlePlanKeyDown(event, plan.id)}
                onClick={() => {
                  if (!subscriptionLocked) setSelectedPlanId(plan.id)
                }}
              >
                {recommended ? (
                  <div className="absolute right-0 top-0 rounded-bl-xl bg-[#0051d5] px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                    Recommended
                  </div>
                ) : null}

                <div className="flex gap-5">
                  <span
                    className={cn(
                      "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                      selected
                        ? "border-[#0051d5] bg-[#0051d5]"
                        : rank === 2
                          ? "border-white/30"
                          : "border-[#c4c6cd]",
                    )}
                  >
                    {selected ? (
                      <span className="size-2 rounded-full bg-white" />
                    ) : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-start justify-between gap-6">
                      <div>
                        <h2
                          className={cn(
                            "flex items-center gap-2 text-[18px] font-semibold leading-6",
                            rank === 2 && selected
                              ? "text-white"
                              : "text-[#0b1c30]",
                          )}
                        >
                          {plan.name}
                          {rank === 1 ? (
                            <ShieldCheck
                              className="size-5 text-[#0051d5]"
                              aria-hidden="true"
                            />
                          ) : null}
                        </h2>
                        {current ? (
                          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[#16a34a]">
                            Current plan
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className={cn(
                            "text-[18px] font-semibold leading-6",
                            rank === 2 && selected
                              ? "text-white"
                              : rank > 0
                                ? "text-[#0051d5]"
                                : "text-[#0b1c30]",
                          )}
                        >
                          {formatPrice(plan.price || 0)}
                        </div>
                        <div
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-widest",
                            rank === 2 && selected
                              ? "text-white/60"
                              : "text-[#43474c]",
                          )}
                        >
                          {getPlanSubtitle(plan)}
                        </div>
                      </div>
                    </div>

                    {rank === 0 ? (
                      <div className="mt-6 border-t border-[#E2E8F0] pt-6">
                        <button
                          type="button"
                          className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[#0051d5] px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#0051d5] transition-colors hover:bg-[#eff4ff] hover:text-[#003ea7]"
                          onClick={(event) => {
                            event.stopPropagation()
                            setBadgeDialogOpen(true)
                          }}
                        >
                          <ShieldCheck className="size-4" aria-hidden="true" />
                          Optional Badge
                        </button>
                        <p className="text-sm leading-5 text-[#43474c]">
                          Free listings do not require a featured badge or paid
                          placement. You can add the badge embed if you want, or
                          continue free without it.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                        {planCopy.features.map((feature) => (
                          <div
                            key={feature}
                            className={cn(
                              "flex items-center gap-2",
                              rank === 2 && selected
                                ? "text-white"
                                : "text-[#0b1c30]",
                            )}
                          >
                            <CheckCircle2
                              className={cn(
                                "size-4 shrink-0",
                                rank === 2 && selected
                                  ? "text-[#dbe1ff]"
                                  : "text-[#16a34a]",
                              )}
                              aria-hidden="true"
                            />
                            {feature}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <aside className="w-full xl:w-[380px]">
          <div className="sticky top-24 rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
            <h2 className="mb-8 text-center text-[12px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">
              Projected Performance
            </h2>

            <div className="relative mb-8 flex justify-center">
              <svg
                className="size-48 -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  stroke="#eff4ff"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  stroke={score >= 90 ? "#061d31" : "#0051d5"}
                  strokeDasharray={circumference}
                  strokeDashoffset={gaugeOffset}
                  strokeWidth="10"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[42px] font-bold leading-none tracking-tight text-[#00162a]">
                  {score}%
                </div>
                <div className="text-[11px] font-bold uppercase text-[#43474c]">
                  Reach Potential
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3 px-1">
                <div className="flex items-end justify-between">
                  <div className="text-[11px] font-bold uppercase text-[#43474c]">
                    {subscriptionLocked
                      ? "Current Subscription"
                      : "Total Due Today"}
                  </div>
                  <div className="text-[18px] font-bold text-[#00162a]">
                    {formatPrice(selectedPlan.price || 0)}
                  </div>
                </div>
              </div>

              {subscriptionLocked ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 w-full rounded-xl text-[12px] font-bold uppercase tracking-widest"
                  disabled={isPortalPending}
                  onClick={openBillingPortal}
                >
                  <CreditCard className="size-4" aria-hidden="true" />
                  {isPortalPending ? "Opening Portal" : "Cancel Subscription"}
                </Button>
              ) : showCurrentPlanNotice ? (
                <div className="rounded-xl border border-[#16a34a]/20 bg-[#16a34a]/10 px-4 py-3 text-center text-sm font-semibold text-[#16a34a]">
                  This is your current plan
                </div>
              ) : (
                <form action={choosePlan}>
                  <input type="hidden" name="planId" value={selectedPlan.id} />
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-[#00162a] text-[12px] font-bold uppercase tracking-widest text-white shadow-lg shadow-[#00162a]/10 hover:bg-black"
                  >
                    <Sparkles className="size-4" aria-hidden="true" />
                    {(selectedPlan.price || 0) === 0
                      ? productIsPublished
                        ? "Continue Free"
                        : "Publish on Free"
                      : "Select Plan"}
                  </Button>
                </form>
              )}

              <p className="text-center text-[10px] leading-relaxed text-[#43474c]">
                {subscriptionLocked
                  ? "Your paid subscription is managed in the billing portal."
                  : "Free placement activates immediately. Paid tiers route through checkout only when selected."}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ProductBadgeCelebrationDialog
        open={badgeDialogOpen}
        onOpenChange={setBadgeDialogOpen}
        productPublicPath={productPublicPath}
      />
    </div>
  )
}
