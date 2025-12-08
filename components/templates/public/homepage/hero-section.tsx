import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { LEADERBOARD_PATH } from "@/lib/routes"
import Hero from "@/components/organisms/directory/Hero"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"
import { PAYMENT_PROVIDERS } from "@/lib/paymentProviders"

export async function HeroSection() {
  const stats = await getLeaderboardStats()

  return (
    <Hero
      stats={stats}
      supportedProviders={PAYMENT_PROVIDERS.map(({ name, logoSrc }) => ({
        name,
        logoSrc,
      }))}
      showDomainRatingBadge={false}
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
    <HeroSkeleton metricCount={0} providerCount={PAYMENT_PROVIDERS.length} />
  )
}
