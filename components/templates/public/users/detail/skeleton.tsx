import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { HomepageFeedSkeleton } from "@/components/templates/public/homepage/homepage-feed-section"

export function UserProfileSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-14 md:px-8">
        <div className="space-y-12">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col gap-10">
              <HeroSkeleton />
              <Skeleton className="h-20 rounded-3xl border border-border/40 bg-white shadow-sm" />
              <section className="space-y-6">
                <HomepageFeedSkeleton />
              </section>
            </div>

            <aside className="flex flex-col gap-8">
              <SidebarCardSkeleton lines={4} />
              <PromoCardSkeleton />
              <PromoCardSkeleton subtle />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-sm md:p-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-5 md:items-center">
            <Skeleton className="h-20 w-20 rounded-[1.5rem]" tone="soft" />
            <div className="space-y-3 md:pt-1">
              <HeadingSkeleton
                lines={2}
                centered={false}
                className="max-w-xl text-gradient"
              />
              <Skeleton className="h-3 w-72 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-64 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-40 rounded-full" tone="brand" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonSkeleton
              size="sm"
              variant="outline"
              labelWidth="8rem"
              className="border-border bg-white"
            />
            <ButtonSkeleton
              size="sm"
              variant="outline"
              labelWidth="7rem"
              className="border-border bg-white"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border bg-white px-5 py-6 shadow-sm"
            >
              <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
              <Skeleton className="mt-4 h-6 w-20 rounded-full" tone="brand" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SidebarCardSkeleton({ lines }: { lines: number }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-background/90 p-6 shadow-sm shadow-black/5">
      <Skeleton className="h-2.5 w-36 rounded-full" tone="muted" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="flex justify-between gap-3">
            <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
            <Skeleton className="h-2 w-16 rounded-full" tone="soft" />
          </div>
        ))}
      </div>
    </section>
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
