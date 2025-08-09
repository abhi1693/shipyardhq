import { Metadata } from "next"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { PricingTable } from "@/components/organisms/PricingTable"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent pricing for every stage.",
}

export default async function PricingPage() {
  const plans = await getPublicPlans()
  return (
    <main className="min-h-screen w-full px-4 md:px-8 py-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Simple, fair pricing
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your launch. Upgrade anytime.
        </p>
      </div>
      <PricingTable plans={plans} />
    </main>
  )
}
