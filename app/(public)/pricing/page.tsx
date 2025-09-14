import { Metadata } from "next"
import { getPublicPlans } from "@/actions/public/plans/actions"
import { PricingTable } from "@/components/organisms/PricingTable"
import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"
import { getProducts } from "@/actions/public/products/featured"
import FeaturedProductGrid from "@/components/molecules/FeaturedProductGrid"
import { PlanType } from "@/lib/vendor/prisma/client"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent pricing for every stage.",
}

export default async function PricingPage() {
  const plans = await getPublicPlans({ type: PlanType.one_time_price })
  const featured = await getProducts("featured")
  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-8">
      <PageHeader
        title="Simple, fair pricing"
        subtitle="Choose a plan and set sail. Upgrade anytime."
        align="center"
      />
      <PricingTable plans={plans} />
      {featured.length > 0 && (
        <div className="pt-8 border-t">
          <PageHeader
            title="Featured Success Stories"
            subtitle="Flagships gaining traction with featured placements"
            align="center"
          />
          <FeaturedProductGrid items={featured.slice(0, 6)} />
        </div>
      )}
    </PublicContainer>
  )
}
