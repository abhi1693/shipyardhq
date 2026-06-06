import { Skeleton } from "@/components/atoms/skeleton"

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-4 text-center shadow-sm">
      <Skeleton className="mx-auto mb-2 h-2.5 w-20 rounded-full" tone="muted" />
      <Skeleton className="mx-auto h-5 w-14 rounded-full" />
    </div>
  )
}

function DetailRowsSkeleton() {
  return (
    <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="border-b border-border pb-4">
        <Skeleton className="mb-3 h-2.5 w-24 rounded-full" tone="muted" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-28 rounded-full" tone="soft" />
          <Skeleton className="h-7 w-24 rounded-full" tone="soft" />
          <Skeleton className="h-7 w-32 rounded-full" tone="soft" />
        </div>
      </div>
      <div className="flex flex-col gap-4 py-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0"
          >
            <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-4">
        <Skeleton className="mb-3 h-2.5 w-24 rounded-full" tone="muted" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" tone="soft" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
      </div>
    </section>
  )
}

function SponsoredSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-[#061d31] p-6">
      <Skeleton className="absolute right-2 top-2 h-4 w-20 rounded" />
      <Skeleton className="mb-3 h-9 w-9 rounded-lg" tone="soft" />
      <Skeleton className="mb-3 h-5 w-40 rounded-full" />
      <Skeleton className="mb-2 h-3 w-full rounded-full" />
      <Skeleton className="mb-4 h-3 w-4/5 rounded-full" />
      <Skeleton className="h-9 w-full rounded" tone="soft" />
    </section>
  )
}

function RelatedSkeleton() {
  return (
    <section>
      <Skeleton className="mb-3 h-2.5 w-32 rounded-full" tone="muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg bg-white p-2"
          >
            <Skeleton className="h-12 w-12 rounded" tone="soft" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-2.5 w-full rounded-full" tone="muted" />
            </div>
            <Skeleton className="h-3 w-5 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function PublicProductDetailSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#f8f9ff]"
      aria-busy="true"
      aria-label="Loading product"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6">
        <header className="mb-6 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-6">
            <Skeleton className="h-16 w-16 rounded-xl md:h-20 md:w-20" />
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-8 w-44 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full" tone="soft" />
              </div>
              <Skeleton className="mb-3 h-4 w-80 max-w-full rounded-full" />
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-3 w-16 rounded-full" tone="muted" />
                <Skeleton className="h-3 w-36 rounded-full" tone="muted" />
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-3 md:w-auto">
            <Skeleton className="h-12 flex-1 rounded-xl md:w-36 md:flex-none" />
            <Skeleton className="h-12 flex-1 rounded-xl md:w-28 md:flex-none" />
            <Skeleton className="h-12 flex-1 rounded-lg md:w-36 md:flex-none" />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <section className="space-y-4">
              <Skeleton className="aspect-[16/9] w-full rounded-xl border border-border shadow-sm" />
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-20 rounded-lg sm:w-32"
                    tone="soft"
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <Skeleton className="mb-4 h-5 w-72 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-3 w-full rounded-full" tone="muted" />
                <Skeleton className="h-3 w-5/6 rounded-full" tone="muted" />
                <Skeleton className="h-3 w-4/5 rounded-full" tone="muted" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-6 w-24 rounded-sm"
                    tone="soft"
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">
            <section className="grid grid-cols-2 gap-3">
              <StatSkeleton />
              <StatSkeleton />
            </section>
            <DetailRowsSkeleton />
            <SponsoredSkeleton />
            <RelatedSkeleton />
          </aside>
        </div>
      </div>
    </main>
  )
}
