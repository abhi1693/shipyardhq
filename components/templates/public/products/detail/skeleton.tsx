import { Skeleton } from "@/components/atoms/skeleton"

export function ProductDetailSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <Skeleton className="h-[420px] rounded-3xl" />
          <Skeleton className="h-[280px] rounded-3xl" />
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      </div>
    </main>
  )
}
