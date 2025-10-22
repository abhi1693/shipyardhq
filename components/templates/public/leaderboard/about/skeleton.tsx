import { Skeleton } from "@/components/atoms/skeleton"

export function LeaderboardGuideSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <div className="mx-auto max-w-[84rem] px-4 py-24 md:px-8 space-y-12">
        <Skeleton className="h-[360px] rounded-3xl" />
        <Skeleton className="h-[320px] rounded-3xl" />
        <Skeleton className="h-[480px] rounded-3xl" />
      </div>
    </main>
  )
}
