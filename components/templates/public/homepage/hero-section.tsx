import Hero from "@/components/organisms/directory/Hero"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"
import { PAYMENT_PROVIDERS } from "@/lib/paymentProviders"

export function HeroSection() {
  return (
    <Hero
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
