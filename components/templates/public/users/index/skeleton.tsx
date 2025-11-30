import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function UsersIndexSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-12 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2.6fr)_minmax(240px,0.9fr)]">
          <div className="flex flex-col gap-10">
            <HeroSkeleton />
            <Skeleton className="h-20 rounded-3xl border border-border/40 bg-white shadow-sm" />
            <section className="space-y-6">
              <MakersGridSkeleton />
            </section>
          </div>
          <aside className="flex w-full max-w-sm flex-col gap-6 lg:ml-auto">
            <PromoCardSkeleton />
            <PromoCardSkeleton subtle />
          </aside>
        </div>
      </div>
    </main>
  )
}

function HeroSkeleton() {
  return (
    <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <div className="space-y-4">
          <Skeleton className="mx-auto h-3 w-40 rounded-full" tone="muted" />
          <HeadingSkeleton lines={2} centered className="text-foreground" />
          <Skeleton className="mx-auto h-3 w-4/5 rounded-full" tone="muted" />
        </div>
        <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <ButtonSkeleton size="lg" labelWidth="10rem" />
          <ButtonSkeleton size="lg" variant="outline" labelWidth="12rem" />
        </div>
      </div>
    </section>
  )
}

function MakersGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <MakerCardSkeleton key={index} />
      ))}
    </div>
  )
}

function MakerCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-white/92 p-5 shadow-[0_26px_70px_-56px_rgba(7,58,104,0.65)]">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" tone="muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-1/2 rounded-full" tone="muted" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-20 rounded-full" tone="muted" />
        <Skeleton className="h-2.5 w-12 rounded-full" tone="brand" />
      </div>
    </div>
  )
}

function PromoCardSkeleton({ subtle = false }: { subtle?: boolean }) {
  return (
    <section className="rounded-3xl border border-border bg-gradient-to-br from-[color:var(--brand-1)/0.08] via-white to-[color:var(--brand-2)/0.08] p-6 text-white shadow-sm">
      <div className="space-y-4">
        <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
        <div className="space-y-2">
          <HeadingSkeleton lines={2} centered={false} className="text-white" />
          <Skeleton className="h-3 w-4/5 rounded-full" tone="muted" />
          <Skeleton className="h-3 w-3/5 rounded-full" tone="muted" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonSkeleton
            size="sm"
            labelWidth="9rem"
            className={subtle ? "bg-white/20" : undefined}
          />
          <Skeleton className="h-3 w-28 rounded-full" tone="soft" />
        </div>
      </div>
    </section>
  )
}
