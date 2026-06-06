import { Skeleton } from "@/components/atoms/skeleton"

export function UserProfileSkeleton() {
  return (
    <main className="bg-[#f8f9ff] text-[#0b1c30]">
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <section className="mb-6 rounded-lg border border-[#e2e8f0] bg-white/80 p-6 shadow-sm md:p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
            <Skeleton className="h-32 w-32 rounded-lg md:h-40 md:w-40" />
            <div className="w-full min-w-0 flex-1 space-y-5 text-center md:text-left">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Skeleton className="mx-auto h-10 w-64 rounded md:mx-0" />
                <div className="flex justify-center gap-2 md:justify-start">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-3xl rounded" />
                <Skeleton className="h-4 w-10/12 max-w-2xl rounded" />
                <Skeleton className="h-4 w-8/12 max-w-xl rounded" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-[#e2e8f0] bg-white p-5"
                >
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="mt-3 h-8 w-16 rounded" />
                </div>
              ))}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <Skeleton className="h-7 w-48 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
              <div aria-hidden className="h-32 md:hidden" />
              <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <Skeleton className="h-8 w-56 rounded" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-10/12 rounded" />
                  <div className="flex justify-between gap-4">
                    <Skeleton className="h-7 w-40 rounded" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                </div>
              </div>
            </section>

            <Skeleton className="h-20 rounded-lg border border-[#e2e8f0] bg-white" />
            <Skeleton className="h-28 rounded-lg border border-[#e2e8f0] bg-[#eff4ff]" />
          </div>

          <aside className="flex flex-col gap-6 lg:col-span-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <section
                key={index}
                className="rounded-lg border border-[#e2e8f0] bg-white p-6"
              >
                <Skeleton className="h-5 w-32 rounded" />
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </section>
            ))}
          </aside>
        </div>
      </div>
    </main>
  )
}
