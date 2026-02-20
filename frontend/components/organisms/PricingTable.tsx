"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import clsx from "clsx"
import { PricingCard } from "@/components/molecules/PricingCard"
import type { PublicPlan } from "@/lib/generated/fastapi/schemas"

const PLAN_TYPE_OPTIONS = [
  { value: "recurring_price", label: "Subscription" },
  { value: "one_time_price", label: "One-time" },
] as const

type PlanTypeOption = (typeof PLAN_TYPE_OPTIONS)[number]["value"]

type PricingTableProps = {
  plans: PublicPlan[]
  renderPlanCTA?: (plan: PublicPlan) => ReactNode
  disableSectionWrapper?: boolean
  showTypeToggle?: boolean
}

export function PricingTable({
  plans,
  renderPlanCTA,
  disableSectionWrapper = false,
  showTypeToggle = false,
}: PricingTableProps) {
  const hasRecurring = plans.some((plan) => plan.type === "recurring_price")
  const hasOneTime = plans.some((plan) => plan.type === "one_time_price")
  const [selectedType, setSelectedType] = useState<PlanTypeOption>(() =>
    hasRecurring ? "recurring_price" : "one_time_price",
  )
  const shouldShowToggle = showTypeToggle && (hasRecurring || hasOneTime)
  const displayPlans = showTypeToggle
    ? plans.filter((plan) => plan.type === selectedType)
    : plans
  const paidPlans = displayPlans.filter((p) => p.price > 0)
  const maxCount = paidPlans.length
    ? Math.max(...paidPlans.map((p) => p.productCount || 0))
    : 0
  const popularPlanId =
    maxCount > 0
      ? paidPlans
          .filter((p) => (p.productCount || 0) === maxCount)
          // Break ties by picking the highest priced plan.
          .sort((a, b) => b.price - a.price)[0]?.id
      : undefined

  const gridClassName = clsx(
    "grid gap-6 grid-cols-1",
    displayPlans.length >= 2 && "sm:grid-cols-2",
    displayPlans.length >= 3 && "xl:grid-cols-3",
  )
  const emptyStateLabel = showTypeToggle
    ? selectedType === "recurring_price"
      ? "subscription"
      : "one-time"
    : "plans"

  const content = (
    <div className="mx-auto max-w-6xl px-4">
      {shouldShowToggle ? (
        <div className="mb-6 flex justify-center">
          <div
            role="tablist"
            aria-label="Plan type"
            className="inline-flex rounded-full border border-border bg-slate-100/80 p-1 shadow-sm"
          >
            {PLAN_TYPE_OPTIONS.map((option) => {
              const isActive = selectedType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedType(option.value)}
                  className={clsx(
                    "cursor-pointer rounded-full border border-transparent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.35]",
                    isActive
                      ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-foreground shadow-sm text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
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
                  : "per product"
                : undefined

            return (
              <CardWrapper key={p.id}>
                <PricingCard
                  name={p.name}
                  description={p.description}
                  price={p.price}
                  priceSuffix={priceSuffix}
                  discount={p.discount}
                  isPopular={p.price > 0 && p.id === popularPlanId}
                  features={p.features ?? []}
                  boostForDays={p.boostForDays}
                  ctaSlot={renderPlanCTA?.(p)}
                />
              </CardWrapper>
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

function CardWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function equalize() {
      const nodes = Array.from(
        document.querySelectorAll<HTMLDivElement>(
          "[data-pricing-card-wrapper]",
        ),
      )
      // Reset heights to natural to measure
      nodes.forEach((n) => (n.style.height = "auto"))
      const baseMin = 30 * 16 // ensure a comfortable minimum height
      const heights = nodes.map((n) => Math.max(n.offsetHeight, baseMin))
      const maxContent = heights.reduce((m, h) => Math.max(m, h), baseMin)
      const target = Math.max(maxContent, baseMin) + 24
      nodes.forEach((n) => (n.style.height = `${target}px`))
    }

    equalize()
    window.addEventListener("resize", equalize)
    return () => window.removeEventListener("resize", equalize)
  }, [])

  return (
    <div ref={ref} data-pricing-card-wrapper className="h-full w-full">
      {children}
    </div>
  )
}
