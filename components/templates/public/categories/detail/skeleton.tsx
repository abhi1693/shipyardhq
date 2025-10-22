import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { ProductCompactGridSkeleton } from "@/components/molecules/ProductCompactGrid.skeleton"

export function CategoryDetailSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-16">
          <HeroSkeleton />
          <Skeleton className="rounded-3xl border border-border/40 bg-background/80 p-6 shadow-[0_24px_80px_-50px_rgba(7,58,104,0.5)]" />
          <FeaturedSkeleton />
          <ProductsSkeleton />
        </div>
      </div>
    </main>
  )
}

function HeroSkeleton() {
  return (
    <section className="rounded-3xl border border-[color:var(--brand-1)/0.18] px-6 py-12 text-white shadow-[0_28px_100px_-48px_rgba(18,66,112,0.65)] backdrop-blur md:px-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl border border-white/40 bg-white/15 shadow-[0_20px_46px_-32px_rgba(7,58,104,0.6)]" />
            <div className="space-y-5">
              <BadgeSkeleton
                variant="outline"
                labelWidth="10rem"
                leadingIcon
                className="h-7 bg-white/15"
              />
              <div className="space-y-3">
                <HeadingSkeleton
                  lines={2}
                  centered={false}
                  className="text-white"
                />
                <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <BadgeSkeleton
                    // eslint-disable-next-line react/no-array-index-key -- decorative
                    key={index}
                    variant="outline"
                    labelWidth={index === 0 ? "8rem" : "7rem"}
                    className="h-7 bg-white/15"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <ButtonSkeleton size="lg" labelWidth="11rem" icon />
            <ButtonSkeleton size="lg" variant="outline" labelWidth="14rem" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              lines={3}
              tone="soft"
              className="rounded-2xl border-white/25 bg-white/90 text-foreground shadow-sm"
              showHeader={false}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedSkeleton() {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/95 px-6 py-10 shadow-[0_24px_80px_-50px_rgba(7,58,104,0.5)] backdrop-blur md:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <HeadingSkeleton lines={1} centered={false} className="max-w-md" />
          <Skeleton className="h-3 w-60 rounded-full" tone="muted" />
        </div>
        <ButtonSkeleton size="sm" variant="outline" labelWidth="7rem" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <CardSkeleton
          lines={4}
          tone="soft"
          className="rounded-3xl border border-border/70 bg-white/95"
          showHeader={false}
        />
        <ProductCompactGridSkeleton count={3} columns="grid-cols-1" />
      </div>
    </section>
  )
}

function ProductsSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <HeadingSkeleton lines={1} centered={false} className="max-w-sm" />
      <Skeleton className="mt-2 h-3 w-64 rounded-full" tone="muted" />
      <div className="mt-8 space-y-6">
        <ProductCompactGridSkeleton
          count={8}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        />
        <ButtonSkeleton
          size="sm"
          variant="outline"
          labelWidth="8rem"
          className="mx-auto"
        />
      </div>
    </section>
  )
}
