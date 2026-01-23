import { getLeaderboardStatsApiV1PublicLeaderboardStatsGet } from "@/lib/generated/fastapi/public-homepage"
import Hero from "@/components/organisms/directory/Hero"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"
import { PAYMENT_PROVIDERS } from "@/lib/paymentProviders"

export async function HeroSection() {
  const response = await getLeaderboardStatsApiV1PublicLeaderboardStatsGet()
  const stats = response.data

  return (
    <Hero
      stats={stats}
      supportedProviders={PAYMENT_PROVIDERS.map(({ name, logoSrc }) => ({
        name,
        logoSrc,
      }))}
      primaryAction={null}
      secondaryAction={null}
    />
  )
}

export function HeroSectionSkeleton() {
  return (
    <HeroSkeleton metricCount={0} providerCount={PAYMENT_PROVIDERS.length} />
  )
}
