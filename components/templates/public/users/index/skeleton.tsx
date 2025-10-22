import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import DirectoryHeaderSkeleton from "@/components/organisms/directory/DirectoryHeader.skeleton"
import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"

export function UsersIndexSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeaderSkeleton />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.05fr)]">
            <div className="flex flex-col gap-10">
              <section className="rounded-3xl border border-border/80 bg-background/78 p-6 shadow-sm shadow-black/5 md:p-8">
                <DirectorySectionHeaderSkeleton descriptionLines={2} />
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <MakerCardSkeleton key={index} highlight />
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-border/80 bg-background/78 p-6 shadow-sm shadow-black/5 md:p-8">
                <DirectorySectionHeaderSkeleton
                  descriptionLines={1}
                  withAction
                />
                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <MakerCardSkeleton key={index} />
                  ))}
                </div>
              </section>
            </div>
            <aside className="flex flex-col gap-8">
              <PromoCardSkeleton />
              <PromoCardSkeleton subtle />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

function MakerCardSkeleton({ highlight = false }: { highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-white/92 p-5 shadow-[0_20px_60px_-46px_rgba(7,58,104,0.38)]">
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-2xl" tone="muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-1/2 rounded-full" tone="muted" />
        </div>
        {highlight ? (
          <BadgeSkeleton
            variant="outline"
            labelWidth="3rem"
            className="h-6 rounded-full"
          />
        ) : null}
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
        <BadgeSkeleton
          variant="outline"
          leadingIcon
          labelWidth="8rem"
          className="h-7 bg-white/20"
        />
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
