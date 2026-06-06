import { Skeleton } from "@/components/atoms/skeleton"

export function BrowsePageSkeleton() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="bg-[#061d31] text-white">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-12 md:px-6 md:py-16">
          <Skeleton className="h-6 w-44 rounded-full bg-white/15" />
          <Skeleton className="mt-5 h-24 w-full max-w-2xl rounded-lg bg-white/15" />
          <Skeleton className="mt-8 h-16 w-full max-w-3xl rounded-lg bg-white/15" />
          <div className="mt-6 flex flex-wrap gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={`browse-hero-chip-${index}`}
                className="h-8 w-32 rounded-full bg-white/15"
              />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-10 px-4 py-12 md:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          <section>
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-8 w-48 rounded-full" tone="muted" />
              <Skeleton className="h-4 w-20 rounded-full" tone="muted" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={`browse-rising-skeleton-${index}`}
                  className="h-48 min-w-[280px] rounded-lg"
                  tone="soft"
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-8 border-b border-[#e2e8f0] pb-6">
              <Skeleton className="h-8 w-44 rounded-full" tone="muted" />
              <Skeleton className="mt-3 h-4 w-72 rounded-full" tone="muted" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton
                  key={`browse-row-skeleton-${index}`}
                  className="h-[90px] rounded-lg"
                  tone="soft"
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-lg border border-[#e2e8f0] bg-white p-6">
          <Skeleton className="h-5 w-28 rounded-full" tone="muted" />
          <div className="mt-6 space-y-7">
            {Array.from({ length: 5 }).map((_, sectionIndex) => (
              <div key={`browse-filter-skeleton-${sectionIndex}`}>
                <Skeleton className="h-4 w-32 rounded-full" tone="muted" />
                <div className="mt-3 space-y-2">
                  {Array.from({ length: sectionIndex === 0 ? 5 : 3 }).map(
                    (_, rowIndex) => (
                      <Skeleton
                        key={`browse-filter-skeleton-${sectionIndex}-${rowIndex}`}
                        className="h-8 rounded-md"
                        tone="soft"
                      />
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}
