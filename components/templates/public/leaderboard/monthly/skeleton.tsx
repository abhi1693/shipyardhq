import { Skeleton } from "@/components/atoms/skeleton"

export function MonthlyLeaderboardSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="relative overflow-hidden border border-border/40 py-24 shadow-[0_60px_140px_-60px_rgba(18,66,112,0.2)]">
        <div className="mx-auto flex max-w-[84rem] flex-col items-center gap-8 px-4 text-center md:px-8">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Skeleton className="h-11 w-full rounded-xl sm:w-64" />
            <Skeleton className="h-11 w-full rounded-xl sm:w-48" />
            <Skeleton className="h-11 w-full rounded-xl sm:w-48" />
          </div>
          <Skeleton className="h-10 w-72 rounded-2xl" />
        </div>
      </section>

      <div className="mx-auto max-w-[84rem] px-4 py-16 md:px-8">
        <div className="space-y-12">
          <Skeleton className="h-[340px] rounded-3xl" />
          <Skeleton className="h-[200px] rounded-3xl" />
          <Skeleton className="h-[500px] rounded-3xl" />
        </div>
      </div>
    </main>
  )
}
