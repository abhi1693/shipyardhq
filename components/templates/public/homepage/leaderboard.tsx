import { getTrendingProducts } from "@/actions/public/products/featured"
import { Leaderboard } from "@/components/organisms/Leaderboard"
import { LeaderboardSkeleton as LeaderboardSectionSkeleton } from "@/components/organisms/Leaderboard.skeleton"

export async function LeaderboardSection() {
  const products = await getTrendingProducts(6)
  return <Leaderboard products={products} />
}

export function LeaderboardSkeleton() {
  return <LeaderboardSectionSkeleton />
}
