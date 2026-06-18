import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function RewardsLeaderboardSkeleton() {
  return (
    <main className="bg-[#f8f9ff] px-4 pb-20 pt-10 md:px-6">
      <div className="mx-auto max-w-[1200px]">
        <RewardsHeroSkeleton />
        <MetricsSkeleton />
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8">
            <RewardsTableSkeleton />
          </section>
          <aside className="space-y-6 lg:col-span-4">
            <CardSkeleton className="h-96 rounded-xl border border-[#E2E8F0] bg-white" />
          </aside>
        </div>
      </div>
    </main>
  )
}

function RewardsHeroSkeleton() {
  return (
    <header className="mx-auto max-w-3xl py-10 text-center md:py-12">
      <Skeleton className="mx-auto h-14 w-14 rounded-xl border border-[#E2E8F0] bg-white" />
      <div className="mt-5 space-y-3">
        <Skeleton className="mx-auto h-10 w-72 max-w-full rounded" />
        <Skeleton className="mx-auto h-4 w-full max-w-2xl rounded" />
        <Skeleton className="mx-auto h-4 w-4/5 max-w-xl rounded" />
      </div>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Skeleton className="h-12 w-full rounded-lg sm:w-44" />
        <Skeleton className="h-12 w-full rounded-lg border border-[#E2E8F0] bg-white sm:w-44" />
      </div>
    </header>
  )
}

function MetricsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-36 rounded-xl border border-[#E2E8F0] bg-white"
        />
      ))}
    </section>
  )
}

function RewardsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <div className="border-b border-[#E2E8F0] p-6">
        <Skeleton className="h-3 w-36 rounded" />
        <Skeleton className="mt-3 h-7 w-64 rounded" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg rounded" />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[90px_1.4fr_120px_170px] border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-20 rounded" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[90px_1.4fr_120px_170px] items-center border-b border-[#E2E8F0] px-6 py-4 last:border-b-0"
            >
              <Skeleton className="h-8 w-10 rounded-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
              <Skeleton className="mx-auto h-4 w-10 rounded" />
              <Skeleton className="ml-auto h-4 w-28 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-5">
        <Skeleton className="mx-auto h-10 w-44 rounded-lg bg-white" />
      </div>
    </div>
  )
}
