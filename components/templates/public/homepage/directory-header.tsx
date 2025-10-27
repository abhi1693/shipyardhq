import { randomInt } from "node:crypto"

import DirectoryHeader, {
  type HeroShowcaseProduct,
} from "@/components/organisms/directory/DirectoryHeader"
import DirectoryHeaderSkeletonSection from "@/components/organisms/directory/DirectoryHeader.skeleton"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { getHomepageFeatureProducts } from "@/actions/public/products/featured"
import { RANK_IN_PUBLIC_PATH } from "@/lib/routes"

export async function DirectoryHeaderSection() {
  const [stats, placements] = await Promise.all([
    getLeaderboardStats(),
    getHomepageFeatureProducts(12),
  ])

  const uniqueProducts = new Map<string, HeroShowcaseProduct>()

  placements.forEach((placement) => {
    const { product, origin, schedule } = placement
    if (!product) return

    const mapKey = product.id
    if (uniqueProducts.has(mapKey)) return

    const planPrice = product.plan?.price ?? 0
    const hasPaidPlan = planPrice > 0
    const redeemedReward = origin === "schedule" && Boolean(schedule?.redemptionId)

    uniqueProducts.set(mapKey, {
      id: product.id,
      name: product.name,
      tagline: product.tagline ?? "Makers discover you here first.",
      votes: product.analytics?.upvotes ?? 0,
      sponsored: hasPaidPlan || redeemedReward,
      slug: product.slug,
      logo: product.logo,
    })
  })

  const candidates = Array.from(uniqueProducts.values())

  const selected: HeroShowcaseProduct[] = []
  if (candidates.length <= 2) {
    selected.push(...candidates)
  } else {
    const usedIndices = new Set<number>()
    while (usedIndices.size < 2) {
      const index = randomInt(candidates.length)
      usedIndices.add(index)
    }
    for (const index of usedIndices) {
      selected.push(candidates[index])
    }
  }

  return (
    <DirectoryHeader
      stats={stats}
      highlightedProducts={selected}
      secondaryAction={{
        label: "Join the live showdown",
        href: RANK_IN_PUBLIC_PATH,
      }}
    />
  )
}

export function DirectoryHeaderSkeleton() {
  return <DirectoryHeaderSkeletonSection metricCount={0} />
}
