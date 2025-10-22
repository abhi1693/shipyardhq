import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { Skeleton } from "@/components/atoms/skeleton"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { RANK_IN_PUBLIC_PATH } from "@/lib/routes"

export async function DirectoryHeaderSection() {
  const stats = await getLeaderboardStats()

  return (
    <DirectoryHeader
      stats={stats}
      secondaryAction={{
        label: "Join the live showdown",
        href: RANK_IN_PUBLIC_PATH,
      }}
    />
  )
}

export function DirectoryHeaderSkeleton() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border px-6 py-12 shadow-sm md:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            <Skeleton className="h-5 w-40 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-11 w-44 rounded-full" />
              <Skeleton className="h-11 w-52 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-7 w-20" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  )
}
