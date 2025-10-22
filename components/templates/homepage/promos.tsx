import { LineChart, Rocket } from "lucide-react"

import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { MEMBER_PRODUCTS_PATH, PRICING_PATH } from "@/lib/routes"

export function LaunchSpotlightPromo() {
  return (
    <DirectoryPromoCard
      eyebrow="Launch with Shipyard"
      title="Claim the homepage spotlight for your next drop"
      description="Publish your launch to unlock priority across the homepage, featured lanes, and leaderboard placements that drive discovery."
      cta={{
        label: "Submit your launch",
        href: MEMBER_PRODUCTS_PATH,
        icon: <Rocket className="h-4 w-4" aria-hidden="true" />,
      }}
    />
  )
}

export function InsightsPromo() {
  return (
    <DirectoryPromoCard
      eyebrow="Shipyard Insights"
      title="Transform real-time signals into your next play"
      description="Run Shipyard Insights to merge analytics, community sentiment, and competitor scans into action-ready recommendations."
      cta={{
        label: "Explore Insights plans",
        href: PRICING_PATH,
        variant: "ghost",
        icon: <LineChart className="h-4 w-4" aria-hidden="true" />,
      }}
    />
  )
}
