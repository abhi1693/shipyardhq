import { Skeleton } from "@/components/atoms/skeleton"

export function RewardsPageSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <div className="mx-auto max-w-[84rem] px-4 py-16 md:px-8 space-y-12">
        <Skeleton className="h-[380px] rounded-3xl" />
        <Skeleton className="h-[260px] rounded-3xl" />
        <Skeleton className="h-[520px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    </main>
  )
}
