import { Skeleton } from "@/components/atoms/skeleton"
import { TrafficSidebarStatsSkeleton } from "@/components/templates/public/common/TrafficSidebarStats"

export function CategoryDetailSkeleton() {
  return (
    <main className="bg-[#f8fafc] text-[#0b1c30]">
      <section className="bg-[#061d31] px-4 py-16 text-white md:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 text-center">
          <Skeleton className="h-16 w-16 rounded-lg bg-white/15" />
          <div className="w-full space-y-3">
            <Skeleton className="mx-auto h-12 w-full max-w-xl rounded bg-white/15" />
            <Skeleton className="mx-auto h-4 w-full max-w-2xl rounded bg-white/10" />
            <Skeleton className="mx-auto h-4 w-10/12 max-w-xl rounded bg-white/10" />
          </div>
          <div className="flex w-full flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Skeleton className="h-12 w-full rounded-lg bg-white/20 sm:w-48" />
            <Skeleton className="h-12 w-full rounded-lg bg-white/10 sm:w-52" />
            <Skeleton className="h-12 w-full rounded-lg bg-white/10 sm:w-44" />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-8 border-t border-white/10 pt-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 text-center">
                <Skeleton className="mx-auto h-8 w-20 rounded bg-white/15" />
                <Skeleton className="mx-auto h-3 w-24 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-12 md:px-6 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-8">
          <Skeleton className="h-24 rounded-lg border border-[#e2e8f0] bg-white" />
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
              <Skeleton className="h-8 w-48 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4"
              >
                <Skeleton className="h-14 w-14 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-48 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-5 w-36 rounded" />
                </div>
                <Skeleton className="h-14 w-16 rounded-lg" />
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <TrafficSidebarStatsSkeleton />
          <Skeleton className="h-96 rounded-lg border border-[#e2e8f0] bg-white" />
          <Skeleton className="h-64 rounded-lg bg-[#0051d5]" />
        </aside>
      </div>
    </main>
  )
}
