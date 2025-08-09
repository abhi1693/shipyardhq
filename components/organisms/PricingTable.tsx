"use client"

import { useEffect, useRef } from "react"
import { PricingCard } from "@/components/molecules/PricingCard"
import type { PublicPlan } from "@/actions/public/plans/actions"

export function PricingTable({ plans }: { plans: PublicPlan[] }) {
  const paidPlans = plans.filter((p) => p.price > 0)
  const maxCount = paidPlans.length
    ? Math.max(...paidPlans.map((p) => p.productCount || 0))
    : 0

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-6 justify-center items-stretch">
          {plans.map((p, i) => (
            <CardWrapper key={p.id} index={i}>
              <PricingCard
                name={p.name}
                description={p.description}
                price={p.price}
                interval={p.interval}
                frequency={p.frequency}
                isPopular={p.price > 0 && (p.productCount || 0) === maxCount && maxCount > 0}
                features={p.features}
              />
            </CardWrapper>
          ))}
        </div>
      </div>
    </section>
  )
}

function CardWrapper({
  children,
  index,
}: {
  children: React.ReactNode
  index: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function equalize() {
      const nodes = Array.from(
        document.querySelectorAll<HTMLDivElement>("[data-pricing-card-wrapper]"),
      )
      // Reset heights to natural to measure
      nodes.forEach((n) => (n.style.height = "auto"))
      const max = nodes.reduce((m, n) => Math.max(m, n.offsetHeight), 0)
      nodes.forEach((n) => (n.style.height = `${max}px`))
    }

    equalize()
    window.addEventListener("resize", equalize)
    return () => window.removeEventListener("resize", equalize)
  }, [])

  return (
    <div
      ref={ref}
      data-pricing-card-wrapper
      className="w-full max-w-sm"
    >
      {children}
    </div>
  )
}
