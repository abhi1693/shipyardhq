"use client"

import { useState, type ReactNode } from "react"
import clsx from "clsx"
import { PricingCard } from "@/components/molecules/PricingCard"
import type { PublicPlan } from "@/actions/public/plans/actions"
import {
  getPricingOfferPresentation,
  getPricingPlanCtaLabel,
  getPricingPlanDescription,
  resolveInitialPricingPlanType,
  resolveRecommendedPlanId,
  selectPricingOfferPlans,
} from "@/lib/pricing/offer"

const PLAN_TYPE_OPTIONS = [
  { value: "one_time_price", label: "One-time launch boost" },
  { value: "recurring_price", label: "Keep my placement running" },
] as const

type PlanTypeOption = (typeof PLAN_TYPE_OPTIONS)[number]["value"]

type PricingTableProps = {
  plans: PublicPlan[]
  renderPlanCTA?: (plan: PublicPlan) => ReactNode
  disableSectionWrapper?: boolean
  showTypeToggle?: boolean
  cardVariant?: "default" | "placement"
}

export function PricingTable({
  plans,
  renderPlanCTA,
  disableSectionWrapper = false,
  showTypeToggle = false,
  cardVariant = "default",
}: PricingTableProps) {
  const availableOptions = PLAN_TYPE_OPTIONS.filter((option) =>
    plans.some((plan) => plan.price > 0 && plan.type === option.value),
  )
  const [selectedType, setSelectedType] = useState<PlanTypeOption>(() =>
    resolveInitialPricingPlanType(plans),
  )
  const effectiveSelectedType = availableOptions.some(
    (option) => option.value === selectedType,
  )
    ? selectedType
    : resolveInitialPricingPlanType(plans)
  const shouldShowToggle = showTypeToggle && availableOptions.length > 1
  const displayPlans = showTypeToggle
    ? selectPricingOfferPlans(plans, effectiveSelectedType)
    : plans
  const recommendedPlanId = resolveRecommendedPlanId(displayPlans)

  const gridClassName = clsx(
    cardVariant === "placement"
      ? "grid gap-8 grid-cols-1"
      : "grid gap-6 grid-cols-1",
    displayPlans.length >= 2 && "sm:grid-cols-2",
    displayPlans.length >= 3 &&
      (cardVariant === "placement" ? "lg:grid-cols-3" : "xl:grid-cols-3"),
  )
  const emptyStateLabel = showTypeToggle
    ? effectiveSelectedType === "recurring_price"
      ? "subscription"
      : "one-time"
    : "plans"

  const content = (
    <div
      className={clsx(
        "mx-auto max-w-6xl",
        cardVariant === "placement" ? "px-0" : "px-4",
      )}
    >
      {shouldShowToggle ? (
        <div className="mb-8 flex flex-col items-center">
          <div
            role="tablist"
            aria-label="Plan type"
            className={clsx(
              "inline-flex rounded-full border p-1",
              cardVariant === "placement"
                ? "border-[#E2E8F0] bg-[#dce9ff]"
                : "border-border bg-slate-100/80 shadow-sm",
            )}
          >
            {PLAN_TYPE_OPTIONS.map((option) => {
              if (
                !availableOptions.some(({ value }) => value === option.value)
              ) {
                return null
              }

              const isActive = effectiveSelectedType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedType(option.value)}
                  className={clsx(
                    "cursor-pointer rounded-full border border-transparent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.35] sm:px-6",
                    isActive
                      ? cardVariant === "placement"
                        ? "bg-white text-black shadow-sm"
                        : "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-foreground shadow-sm text-white"
                      : cardVariant === "placement"
                        ? "text-[#43474c] hover:text-black"
                        : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-center text-xs text-[#43474c]">
            {effectiveSelectedType === "recurring_price"
              ? "Renews automatically so your placement stays active. Cancel anytime."
              : "One payment. Your plan ends after the stated launch window."}
          </p>
        </div>
      ) : null}
      {displayPlans.length ? (
        <div className={gridClassName}>
          {displayPlans.map((p) => {
            const recurringSuffix = (p as any).priceSuffix as string | undefined
            const priceSuffix =
              p.price > 0
                ? recurringSuffix
                  ? `${recurringSuffix} / product`
                  : p.type === "recurring_price"
                    ? "recurring / product"
                    : "one-time / product"
                : undefined
            const offer = getPricingOfferPresentation(p, displayPlans)

            return (
              <PricingCard
                key={p.id}
                name={p.name}
                description={getPricingPlanDescription(p)}
                price={p.price}
                priceSuffix={priceSuffix}
                discount={p.discount}
                isRecommended={p.price > 0 && p.id === recommendedPlanId}
                features={p.features}
                featureIntro={offer.intro}
                offerItems={offer.items}
                boostForDays={p.boostForDays}
                ctaLabel={getPricingPlanCtaLabel(p)}
                ctaSlot={renderPlanCTA?.(p)}
                variant={cardVariant}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
          No {emptyStateLabel} available yet.
        </div>
      )}
    </div>
  )

  if (disableSectionWrapper) {
    return content
  }

  return <section className="py-12">{content}</section>
}
