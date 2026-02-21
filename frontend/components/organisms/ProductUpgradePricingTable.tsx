"use client"

import { IconArrowUpRight } from "@tabler/icons-react"

import { PricingTable } from "@/components/organisms/PricingTable"
import MemberChoosePlanButton from "@/components/molecules/MemberChoosePlanButton"
import type { PublicPlan } from "@/lib/generated/fastapi/schemas"

export function ProductUpgradePricingTable({
  plans,
  productId,
  redirectPath,
  currentPlanId,
  showTypeToggle = false,
}: {
  plans: PublicPlan[]
  productId: string
  redirectPath: string
  currentPlanId?: string | null
  showTypeToggle?: boolean
}) {
  return (
    <PricingTable
      plans={plans}
      showTypeToggle={showTypeToggle}
      renderPlanCTA={(plan) => {
        const isCurrentPlan = currentPlanId != null && plan.id === currentPlanId

        if (isCurrentPlan) {
          return (
            <div className="rounded-2xl border border-[color:var(--brand-1)/0.25] bg-[color:var(--brand-1)/0.08] px-4 py-3 text-center text-sm font-semibold text-[color:var(--brand-1)]">
              Current plan
            </div>
          )
        }

        return (
          <MemberChoosePlanButton
            productId={productId}
            planId={plan.id}
            redirectPath={redirectPath}
            className="group w-full justify-center gap-2 shadow-[0px_22px_55px_-32px_rgba(7,58,104,0.65)] transition hover:shadow-[0px_30px_70px_-38px_rgba(7,78,134,0.7)]"
          >
            Choose {plan.name}
            <IconArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </MemberChoosePlanButton>
        )
      }}
    />
  )
}
