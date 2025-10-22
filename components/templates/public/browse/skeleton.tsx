import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { ProductListSkeleton } from "@/components/molecules/ProductList.skeleton"
import { ProductCompactCardSkeleton } from "@/components/molecules/ProductCompactCard.skeleton"
import DirectoryHeaderSkeleton from "@/components/organisms/directory/DirectoryHeader.skeleton"
import { ProductUpdatesFeedSkeleton } from "@/components/molecules/ProductUpdatesFeed.skeleton"

export function BrowsePageSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeaderSkeleton />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col gap-8">
              <FilterBarSkeleton />
              <section className="rounded-3xl border border-border/70 bg-background/85 p-6 shadow-sm shadow-black/5 md:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <HeadingSkeleton
                      lines={1}
                      centered={false}
                      className="max-w-xl"
                    />
                    <Skeleton className="h-3 w-60 rounded-full" tone="muted" />
                  </div>
                  <Skeleton
                    className="h-3 w-28 rounded-full sm:h-2.5"
                    tone="muted"
                  />
                </div>

                <div className="mt-6 space-y-6">
                  <ProductListSkeleton
                    count={8}
                    columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    showCategory
                    showBadges
                    showMetaBadge
                  />
                  <Skeleton
                    className="mx-auto h-10 w-48 rounded-full"
                    tone="soft"
                  />
                </div>
              </section>
            </div>
            <aside className="flex flex-col gap-6">
              <FeaturedCarouselSkeleton />
              <CategoryRailSkeleton />
              <PromoCardSkeleton />
              <PromoCardSkeleton subtle />
              <ProductUpdatesFeedSkeleton />
            </aside>
          </div>

          <HowItWorksSkeleton />
        </div>
      </div>
    </main>
  )
}

function FilterBarSkeleton() {
  return (
    <section className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            // eslint-disable-next-line react/no-array-index-key -- purely visual
            key={index}
            className="h-9 w-36 rounded-full"
            tone="soft"
          />
        ))}
        <Skeleton className="ml-auto h-9 w-24 rounded-full" tone="soft" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton
            // eslint-disable-next-line react/no-array-index-key -- decorative
            key={index}
            lines={1}
            tone="soft"
            className="rounded-2xl border border-border bg-white/90"
            showHeader={false}
          />
        ))}
      </div>
    </section>
  )
}

function FeaturedCarouselSkeleton() {
  return (
    <section className="flex w-full flex-col gap-4 rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm shadow-black/5">
      <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
      <div className="relative h-[150px] overflow-hidden">
        <ProductCompactCardSkeleton showCategory withMeta className="h-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              className="h-1 w-4 rounded-full"
              tone={index === 0 ? "brand" : "muted"}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ButtonSkeleton size="icon" variant="outline" />
          <ButtonSkeleton size="icon" variant="outline" />
        </div>
      </div>
    </section>
  )
}

function CategoryRailSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <HeadingSkeleton lines={1} centered={false} className="max-w-xs" />
        <Skeleton className="h-3 w-48 rounded-full" tone="muted" />
      </div>
      <ul className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <li
            // eslint-disable-next-line react/no-array-index-key -- decorative
            key={index}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-2"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" tone="soft" />
              <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
            </div>
            <Skeleton className="h-2.5 w-10 rounded-full" tone="brand" />
          </li>
        ))}
      </ul>
    </section>
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
            labelWidth="8rem"
            className={subtle ? "bg-white/20" : undefined}
          />
          <Skeleton className="h-3 w-24 rounded-full" tone="soft" />
        </div>
      </div>
    </section>
  )
}

function HowItWorksSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <HeadingSkeleton lines={1} centered={false} className="max-w-sm" />
          <Skeleton className="h-3 w-64 rounded-full" tone="muted" />
        </div>
        <BadgeSkeleton variant="outline" labelWidth="7rem" className="h-7" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardSkeleton
            // eslint-disable-next-line react/no-array-index-key -- decorative
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
