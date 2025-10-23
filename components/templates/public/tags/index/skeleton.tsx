import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { ProductCompactGridSkeleton } from "@/components/molecules/ProductCompactGrid.skeleton"

export function TagsIndexSkeleton() {
  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <header className="space-y-3 pb-10">
          <BadgeSkeleton
            variant="outline"
            leadingIcon
            labelWidth="8rem"
            className="h-7"
          />
          <HeadingSkeleton lines={1} centered={false} className="max-w-lg" />
          <Skeleton className="h-3 w-2/3 rounded-full" tone="muted" />
        </header>

        <div className="space-y-10">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 sm:px-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <HeadingSkeleton
                  lines={1}
                  centered={false}
                  className="max-w-xs"
                />
                <Skeleton className="h-3 w-60 rounded-full" tone="muted" />
              </div>
              <ButtonSkeleton
                size="sm"
                variant="ghost"
                labelWidth="9rem"
                className="bg-white/70"
              />
            </header>
            <TagCloudSkeleton />
          </section>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="space-y-1">
                <HeadingSkeleton
                  lines={1}
                  centered={false}
                  className="max-w-sm"
                />
                <Skeleton className="h-3 w-48 rounded-full" tone="muted" />
              </div>
              <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
            </div>

            <ProductCompactGridSkeleton
              count={6}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            />

            <div className="flex items-center justify-between border-t border-slate-200 pt-6">
              <ButtonSkeleton
                size="sm"
                variant="outline"
                labelWidth="5rem"
                className="bg-slate-100/70"
              />
              <ButtonSkeleton
                size="sm"
                variant="outline"
                labelWidth="4.5rem"
                className="bg-slate-100/70"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function TagCloudSkeleton() {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {Array.from({ length: 14 }).map((_, index) => (
        <Skeleton
           
          key={index}
          className="h-9 rounded-full px-5"
          tone={index % 3 === 0 ? "brand" : "soft"}
        >
          <span className="inline-flex h-full w-full items-center justify-center">
            <Skeleton className="h-3 w-16 rounded-full" tone="muted" />
          </span>
        </Skeleton>
      ))}
    </div>
  )
}
