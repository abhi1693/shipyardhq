import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import DirectoryHeaderSkeletonSection from "@/components/organisms/directory/DirectoryHeader.skeleton"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import { RANK_IN_PUBLIC_PATH } from "@/lib/routes"
import { Suspense } from "react"

export async function DirectoryHeaderSection() {
  const stats = await getLeaderboardStats()

  return (
    <DirectoryHeader
      stats={stats}
      secondaryAction={{
        label: "Join the live showdown",
        href: RANK_IN_PUBLIC_PATH,
      }}
      aside={
        <Suspense fallback={<SponsoredProductsSkeleton />}>
          {/* Sponsors card reused from homepage templates */}
          <SponsoredProductsSection />
        </Suspense>
      }
    />
  )
}

export function DirectoryHeaderSkeleton() {
  return <DirectoryHeaderSkeletonSection metricCount={0} />
}
