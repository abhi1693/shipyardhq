import { Skeleton } from "@/components/atoms/skeleton"

const containerClasses =
  "rounded-xl border border-border/40 bg-white/90 px-4 py-4"

export function DirectoryHighlightsSidebarSkeleton() {
  return (
    <section className={containerClasses} aria-hidden>
      <div className="space-y-1">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-4 w-28 rounded-full" />
      </div>
      <div className="mt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`directory-sidebar-skeleton-${index}`}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-3 w-10 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, pillIndex) => (
                <Skeleton
                  key={`directory-sidebar-pill-${index}-${pillIndex}`}
                  className="h-3 w-40 rounded-full"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
