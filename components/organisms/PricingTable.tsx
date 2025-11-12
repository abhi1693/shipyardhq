"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { PricingCard } from "@/components/molecules/PricingCard"
import type { PublicPlan } from "@/actions/public/plans/actions"

type PricingTableProps = {
  plans: PublicPlan[]
  renderPlanCTA?: (plan: PublicPlan) => ReactNode
}

export function PricingTable({ plans, renderPlanCTA }: PricingTableProps) {
  const paidPlans = plans.filter((p) => p.price > 0)
  const maxCount = paidPlans.length
    ? Math.max(...paidPlans.map((p) => p.productCount || 0))
    : 0

  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => {
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
                  isPopular={
                    p.price > 0 &&
                    (p.productCount || 0) === maxCount &&
                    maxCount > 0
                  }
                  features={p.features}
                  boostForDays={p.boostForDays}
                  ctaSlot={renderPlanCTA?.(p)}
                />
              </CardWrapper>
            )
          })}
        </div>
      </div>
    </section>
  )
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
