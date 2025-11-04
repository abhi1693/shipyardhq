import Hero from "@/components/organisms/directory/Hero"
import HeroSkeleton from "@/components/organisms/directory/Hero.skeleton"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { LEADERBOARD_PATH } from "@/lib/routes"

export async function HeroSection() {
  const stats = await getLeaderboardStats()

  return (
    <Hero
      stats={stats}
      secondaryAction={{
        label: "View the leaderboard",
        href: LEADERBOARD_PATH,
        variant: "outline",
      }}
    />
  )
}

export function HeroSectionSkeleton() {
  return <HeroSkeleton metricCount={0} />
}
