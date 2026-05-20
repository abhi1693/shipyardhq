import Hero from "@/components/organisms/directory/Hero"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"

export function HeroSection() {
  return <Hero primaryAction={null} secondaryAction={null} />
}

export function HeroSectionSkeleton() {
  return <HeroSkeleton metricCount={0} />
}
