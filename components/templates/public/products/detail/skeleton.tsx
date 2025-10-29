import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import ProductListSkeleton from "@/components/molecules/ProductList.skeleton"

export function ProductDetailSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,2.4fr)_minmax(260px,1fr)] xl:grid-cols-[minmax(0,2.8fr)_minmax(260px,1fr)]">
          <div className="space-y-10">
            <ProductHeroSkeleton />
            <Skeleton className="rounded-3xl border border-border/40 bg-white/70 p-6 shadow-sm">
              <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
            </Skeleton>
            <MediaGallerySkeleton />
            <NarrativeSkeleton />
            <ChangelogSkeleton />
            <ReviewsSkeleton />
          </div>

          <aside className="space-y-6">
            <SupportCardSkeleton />
            <StatsCardSkeleton />
            <SignalLinksSkeleton />
            <CrewRosterSkeleton />
            <NewsletterSkeleton />
            <SimilarVoyagesSkeleton />
          </aside>
        </div>
      </div>
    </main>
  )
}

function ProductHeroSkeleton() {
  return (
    <section className="space-y-6 rounded-3xl border border-border bg-white px-6 py-7 shadow-sm">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex gap-5">
          <Skeleton
            className="h-20 w-20 shrink-0 rounded-2xl border border-border/70"
            tone="soft"
          />
          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <BadgeSkeleton
                  variant="outline"
                  labelWidth="5rem"
                  className="h-6"
                />
                <BadgeSkeleton
                  variant="outline"
                  labelWidth="7rem"
                  className="h-6"
                />
              </div>
              <HeadingSkeleton
                lines={1}
                centered={false}
                className="max-w-xl"
              />
              <Skeleton className="h-3 w-72 rounded-full" tone="muted" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <BadgeSkeleton
                  key={index}
                  variant="outline"
                  labelWidth={index === 0 ? "6rem" : "5rem"}
                  className="h-7"
                />
              ))}
            </div>
            <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <ButtonSkeleton size="lg" labelWidth="9rem" icon />
        <ButtonSkeleton size="lg" variant="outline" labelWidth="8rem" />
        <ButtonSkeleton size="lg" variant="outline" labelWidth="7rem" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.35)]">
          <Skeleton className="h-3 w-28 rounded-full" tone="muted" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <BadgeSkeleton
                key={index}
                variant="outline"
                labelWidth={index % 2 === 0 ? "5rem" : "4rem"}
                className="h-7"
              />
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.35)]">
          <Skeleton className="h-3 w-28 rounded-full" tone="muted" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <BadgeSkeleton
                key={index}
                variant="outline"
                labelWidth={index % 2 === 0 ? "6rem" : "5rem"}
                className="h-7"
              />
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
        <Skeleton className="h-3 w-48 rounded-full" tone="muted" />
        <Skeleton className="mt-2 h-3 w-3/4 rounded-full" tone="muted" />
        <ButtonSkeleton
          size="sm"
          variant="outline"
          labelWidth="8rem"
          className="mt-4"
        />
      </div>
    </section>
  )
}

function MediaGallerySkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-2xl" tone="soft" shimmer={false} />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-36 rounded-xl"
              tone="soft"
              shimmer={false}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function NarrativeSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <HeadingSkeleton lines={1} centered={false} className="max-w-sm" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-3 rounded-full"
            tone="muted"
            style={{ width: index === 4 ? "70%" : "100%" }}
          />
        ))}
      </div>
    </section>
  )
}

function ChangelogSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <HeadingSkeleton lines={1} centered={false} className="max-w-sm" />
        <ButtonSkeleton size="sm" variant="ghost" labelWidth="7rem" />
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardSkeleton
            key={index}
            lines={3}
            tone="soft"
            className="rounded-2xl border border-border/70 bg-white/90"
            showHeader={false}
          />
        ))}
      </div>
    </section>
  )
}

function ReviewsSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <HeadingSkeleton lines={1} centered={false} className="max-w-md" />
          <Skeleton className="h-3 w-60 rounded-full" tone="muted" />
        </div>
        <ButtonSkeleton size="sm" variant="outline" labelWidth="8rem" />
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardSkeleton
            key={index}
            lines={4}
            tone="soft"
            className="rounded-2xl border border-border/70 bg-white/90"
            showHeader={false}
          />
        ))}
      </div>
    </section>
  )
}

function SupportCardSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <Skeleton className="h-3 w-28 rounded-full" tone="muted" />
      <Skeleton className="mt-2 h-3 w-48 rounded-full" tone="muted" />
      <ButtonSkeleton size="sm" labelWidth="8rem" className="mt-4" />
    </section>
  )
}

function StatsCardSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <Skeleton className="h-3 w-36 rounded-full" tone="muted" />
      <div className="mt-4 grid gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/70 bg-white px-4 py-3 shadow-sm"
          >
            <Skeleton className="h-2 w-24 rounded-full" tone="muted" />
            <Skeleton className="mt-3 h-4 w-16 rounded-full" tone="brand" />
          </div>
        ))}
      </div>
    </section>
  )
}

function SignalLinksSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <Skeleton className="h-3 w-28 rounded-full" tone="muted" />
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 rounded-full px-4" tone="soft">
            <Skeleton className="h-3 w-16 rounded-full" tone="muted" />
          </Skeleton>
        ))}
      </div>
    </section>
  )
}

function CrewRosterSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/95 p-3"
          >
            <Skeleton className="size-10 rounded-full" tone="soft" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
              <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function NewsletterSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
      <HeadingSkeleton lines={1} centered className="max-w-xs mx-auto" />
      <Skeleton className="mx-auto mt-3 h-3 w-3/4 rounded-full" tone="muted" />
      <div className="mt-6 space-y-3">
        <Skeleton
          className="mx-auto h-10 w-full max-w-xs rounded-full"
          tone="soft"
        />
        <ButtonSkeleton size="lg" labelWidth="9rem" />
      </div>
    </section>
  )
}

function SimilarVoyagesSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <HeadingSkeleton lines={1} centered={false} className="max-w-sm" />
      <Skeleton className="mt-2 h-3 w-2/3 rounded-full" tone="muted" />
      <div className="mt-6">
        <ProductListSkeleton count={4} />
      </div>
      <ButtonSkeleton
        size="sm"
        variant="outline"
        labelWidth="9rem"
        className="mt-6"
      />
    </section>
  )
}
