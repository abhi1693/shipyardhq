import { getRewardsLeaderboardEntries } from "@/actions/public/rewards/actions"
import { hydrateRewardsLeaderboardEntries } from "@/lib/rewards/display"
import { RewardsLeaderboardPreview } from "@/components/organisms/RewardsLeaderboardPreview"
import { Skeleton } from "@/components/atoms/skeleton"

export async function RewardsLeaderboardSection() {
  const entries = await getRewardsLeaderboardEntries(3)
  const hydrated = await hydrateRewardsLeaderboardEntries(entries)
  return <RewardsLeaderboardPreview entries={hydrated} />
}

export function RewardsLeaderboardSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </section>
  )
}
