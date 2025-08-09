"use client"

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
          {plans.map((p) => (
            <div key={p.id} className="w-full max-w-sm h-full">
              <PricingCard
                name={p.name}
                description={p.description}
                price={p.price}
                interval={p.interval}
                frequency={p.frequency}
                isPopular={p.price > 0 && (p.productCount || 0) === maxCount && maxCount > 0}
                features={p.features}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
