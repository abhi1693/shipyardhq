import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import ProductListSkeleton from "@/components/molecules/ProductList.skeleton"

export function MonthlyLeaderboardSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="relative overflow-hidden border border-[color:var(--brand-1)/0.18] py-24 shadow-[0px_60px_140px_-60px_rgba(18,66,112,0.7)]">
        <div className="mx-auto flex max-w-[84rem] flex-col items-center gap-8 px-4 text-center text-white md:px-8">
          <BadgeSkeleton
            variant="outline"
            labelWidth="9rem"
            leadingIcon
            className="h-8 bg-white/10"
          />
          <div className="space-y-4">
            <HeadingSkeleton lines={2} centered className="text-white" />
            <Skeleton className="mx-auto h-4 w-3/4 rounded-full" tone="muted" />
          </div>
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Skeleton className="h-12 w-full max-w-xs rounded-xl" tone="soft" />
            <ButtonSkeleton size="lg" labelWidth="8.5rem" />
            <ButtonSkeleton size="lg" variant="outline" labelWidth="8rem" />
          </div>
          <Skeleton className="h-10 w-72 rounded-2xl" tone="soft" />
        </div>
      </section>

      <div className="mx-auto max-w-[84rem] px-4 py-16 md:px-8">
        <div className="space-y-12">
          <TopPlacementSkeleton />
          <RunnerUpSkeleton />
          <ArchiveGridSkeleton />
        </div>
      </div>
    </main>
  )
}

function TopPlacementSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <HeadingSkeleton lines={1} centered={false} className="max-w-sm" />
      <CardSkeleton
        lines={4}
        tone="soft"
        className="mt-6 rounded-3xl border border-border/70 bg-white/92"
        showHeader={false}
      />
    </section>
  )
}

function RunnerUpSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <HeadingSkeleton lines={1} centered={false} className="max-w-md" />
        <BadgeSkeleton variant="outline" labelWidth="6rem" className="h-7" />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <CardSkeleton
            key={index}
            lines={3}
            tone="soft"
            className="rounded-2xl border border-border/70 bg-white/92"
            showHeader={false}
          />
        ))}
      </div>
    </section>
  )
}

function ArchiveGridSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <HeadingSkeleton lines={1} centered={false} className="max-w-lg" />
          <Skeleton className="h-3 w-64 rounded-full" tone="muted" />
        </div>
        <ButtonSkeleton size="sm" variant="outline" labelWidth="7rem" />
      </div>
      <div className="mt-8">
        <ProductListSkeleton count={6} />
      </div>
    </section>
  )
}
