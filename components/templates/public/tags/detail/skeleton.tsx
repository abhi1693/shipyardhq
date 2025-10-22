import { Skeleton } from "@/components/atoms/skeleton"

export function TagDetailSkeleton() {
  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="space-y-10">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      </div>
    </main>
  )
}
