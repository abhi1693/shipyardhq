import Hero from "@/components/organisms/directory/Hero"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { LEADERBOARD_PATH } from "@/lib/routes"

const SUPPORTED_PROVIDERS = [
  { name: "Stripe", logoSrc: "/providers/stripe.jpeg" },
  { name: "Polar", logoSrc: "/providers/polar.png" },
  { name: "Paddle", logoSrc: "/providers/paddle.png" },
  { name: "Dodo", logoSrc: "/providers/dodo.jpeg" },
  { name: "RevenueCat", logoSrc: "/providers/revenuecat.png" },
  { name: "Lemon Squeezy", logoSrc: "/providers/lemon.jpeg" },
  { name: "AbacatePay", logoSrc: "/providers/abacatepay.jpeg" },
] as const

export async function HeroSection() {
  const stats = await getLeaderboardStats()

  return (
    <Hero
      stats={stats}
      supportedProviders={[...SUPPORTED_PROVIDERS]}
      secondaryAction={{
        label: "View the leaderboard",
        href: LEADERBOARD_PATH,
        variant: "outline",
      }}
    />
  )
}

export function HeroSectionSkeleton() {
  return (
    <HeroSkeleton
      metricCount={0}
      providerCount={SUPPORTED_PROVIDERS.length}
    />
  )
}
