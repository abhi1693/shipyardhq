import { Metadata } from "next"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { PricingTable } from "@/components/organisms/PricingTable"
import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent pricing for every stage.",
}

export default async function PricingPage() {
  const plans = await getPublicPlans()
  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-8">
      <PageHeader
        title="Simple, fair pricing"
        subtitle="Choose the plan that fits your launch. Upgrade anytime."
        align="center"
      />
      <PricingTable plans={plans} />
    </PublicContainer>
  )
}
