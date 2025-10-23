import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"

export function ProductUpdatesArchiveSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          <header className="rounded-3xl border border-border/70 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Skeleton
                className="h-16 w-16 rounded-lg border border-border/70"
                tone="soft"
              />
              <div className="flex-1 space-y-2">
                <BadgeSkeleton
                  variant="outline"
                  labelWidth="8rem"
                  className="h-7"
                />
                <HeadingSkeleton
                  lines={1}
                  centered={false}
                  className="max-w-sm"
                />
                <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
                <ButtonSkeleton size="sm" variant="outline" labelWidth="7rem" />
              </div>
            </div>
          </header>

          <section className="space-y-6 rounded-3xl border border-border/70 bg-white p-6 shadow-sm">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton
                 
                key={index}
                lines={4}
                tone="soft"
                className="rounded-2xl border border-border/70 bg-white/92"
                showHeader={false}
              />
            ))}
            <ButtonSkeleton
              size="sm"
              variant="outline"
              labelWidth="8rem"
              className="mx-auto mt-4"
            />
          </section>
        </div>
      </div>
    </main>
  )
}
