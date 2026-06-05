import { Skeleton } from "@/components/atoms/skeleton"

export function RewardsPageSkeleton() {
  return (
    <main className="bg-[#f8f9ff] text-[#0b1c30]">
      <section className="relative overflow-hidden bg-[#061d31] px-4 pb-48 pt-16 text-white md:px-6 md:pb-16">
        <div
          aria-hidden
          className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_2px_2px,#ffffff_1px,transparent_0)] [background-size:40px_40px]"
        />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <Skeleton className="mx-auto h-7 w-44 rounded-full bg-white/15" />
          <Skeleton className="mx-auto mt-6 h-12 w-full max-w-3xl rounded bg-white/15" />
          <Skeleton className="mx-auto mt-3 h-12 w-10/12 max-w-2xl rounded bg-white/15" />
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Skeleton className="h-12 w-full rounded-full bg-white/20 sm:w-44" />
            <Skeleton className="h-12 w-full rounded-full bg-white/10 sm:w-40" />
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-white/10 bg-white/[0.06] p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-4 w-28 rounded bg-white/15" />
                  <Skeleton className="h-5 w-5 rounded bg-white/15" />
                </div>
                <Skeleton className="mt-4 h-8 w-24 rounded bg-white/15" />
                <Skeleton className="mt-2 h-3 w-28 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-10 w-80 max-w-full rounded" />
          </div>
          <Skeleton className="h-16 w-full max-w-md rounded" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg bg-[#061d31] p-6">
              <div className="mb-8 flex items-start justify-between gap-3">
                <Skeleton className="h-10 w-10 rounded-lg bg-white/15" />
                <Skeleton className="h-6 w-24 rounded bg-white/10" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded bg-white/15" />
              <Skeleton className="mt-3 h-4 w-full rounded bg-white/10" />
              <Skeleton className="mt-2 h-4 w-10/12 rounded bg-white/10" />
              <div className="mt-8 border-t border-white/10 pt-5">
                <Skeleton className="h-7 w-32 rounded bg-white/15" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-20 md:px-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
            <Skeleton className="mx-auto h-4 w-44 rounded" />
            <Skeleton className="mx-auto h-10 w-80 max-w-full rounded" />
            <Skeleton className="mx-auto h-12 w-full rounded" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-72 flex-col rounded-lg border border-[#e2e8f0] bg-white p-8"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <Skeleton className="h-6 w-24 rounded" />
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
                <Skeleton className="h-8 w-3/4 rounded" />
                <Skeleton className="mt-4 h-4 w-full rounded" />
                <Skeleton className="mt-2 h-4 w-11/12 rounded" />
                <div className="mt-auto border-t border-[#e2e8f0] pt-6">
                  <Skeleton className="h-8 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
