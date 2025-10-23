import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { ProductCompactGridSkeleton } from "@/components/molecules/ProductCompactGrid.skeleton"

export function UseCaseDetailSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="relative overflow-hidden border border-[color:var(--brand-1)/0.18] py-20 shadow-[0px_70px_160px_-70px_rgba(18,66,112,0.75)]">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center text-white">
            <div className="space-y-4">
              <BadgeSkeleton
                variant="outline"
                labelWidth="7rem"
                leadingIcon
                className="h-7 bg-white/15"
              />
              <HeadingSkeleton lines={2} centered className="text-white" />
              <Skeleton
                className="mx-auto h-3 w-3/4 rounded-full"
                tone="muted"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.28em] text-white/80">
              {Array.from({ length: 3 }).map((_, index) => (
                <BadgeSkeleton
                   
                  key={index}
                  variant="outline"
                  labelWidth={index === 0 ? "9rem" : "8rem"}
                  className="h-7 bg-white/15"
                />
              ))}
            </div>
            <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <ButtonSkeleton size="lg" labelWidth="12rem" />
              <ButtonSkeleton size="lg" variant="outline" labelWidth="12rem" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[84rem] px-4 py-16 md:px-8 space-y-16">
        <section className="mx-auto max-w-5xl space-y-8 text-center">
          <div className="space-y-3">
            <HeadingSkeleton lines={1} centered className="mx-auto max-w-xl" />
            <Skeleton className="mx-auto h-3 w-2/3 rounded-full" tone="muted" />
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton
                 
                key={index}
                lines={2}
                tone="soft"
                className="w-full max-w-xs rounded-2xl border border-border/70 bg-white/92"
                showHeader={false}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
          <HeadingSkeleton lines={1} centered={false} className="max-w-sm" />
          <Skeleton className="mt-2 h-3 w-64 rounded-full" tone="muted" />
          <div className="mt-8 space-y-6">
            <ProductCompactGridSkeleton
              count={9}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            />
            <ButtonSkeleton
              size="sm"
              variant="outline"
              labelWidth="9rem"
              className="mx-auto"
            />
          </div>
        </section>

        <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/82 px-8 py-12 text-center shadow-[0px_32px_90px_-60px_rgba(7,58,104,0.55)] backdrop-blur">
          <HeadingSkeleton lines={1} centered className="max-w-md" />
          <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
          <ButtonSkeleton size="lg" labelWidth="11rem" />
        </section>

        <section className="mx-auto max-w-[84rem] overflow-hidden rounded-[46px] border border-primary/15 px-0">
          <CardSkeleton
            lines={4}
            tone="soft"
            className="rounded-[inherit] border-none bg-white"
            showHeader={false}
          />
        </section>
      </div>
    </main>
  )
}
