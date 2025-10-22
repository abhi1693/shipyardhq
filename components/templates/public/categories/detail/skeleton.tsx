import { Skeleton } from "@/components/atoms/skeleton"

export function CategoryDetailSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-16">
          <Skeleton className="h-[380px] rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-[520px] rounded-3xl" />
          <Skeleton className="h-[260px] rounded-3xl" />
        </div>
      </div>
    </main>
  )
}
