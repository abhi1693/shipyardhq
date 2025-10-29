import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import ProductListSkeleton from "@/components/molecules/ProductList.skeleton"
import { DirectoryProductListSkeleton } from "@/components/organisms/directory/DirectoryProductList.skeleton"
import DirectoryRadarDigestSkeleton from "@/components/organisms/directory/RadarDigest.skeleton"

export function RewardsPageSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="relative overflow-hidden border border-[color:var(--brand-1)/0.18] py-24 shadow-[0px_70px_160px_-70px_rgba(18,66,112,0.65)]">
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 text-center text-white md:px-8">
          <BadgeSkeleton
            variant="outline"
            labelWidth="10rem"
            leadingIcon
            className="h-8 bg-white/15"
          />
          <div className="space-y-6 text-balance">
            <HeadingSkeleton lines={3} centered className="text-white" />
            <Skeleton
              className="mx-auto h-3 w-11/12 rounded-full md:w-4/5"
              tone="muted"
            />
            <Skeleton
              className="mx-auto h-3 w-3/4 rounded-full md:w-2/3"
              tone="muted"
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <ButtonSkeleton
              size="lg"
              labelWidth="9.5rem"
              icon
              className="px-8"
            />
            <ButtonSkeleton size="lg" variant="outline" labelWidth="8.5rem" />
            <ButtonSkeleton
              size="lg"
              variant="outline"
              labelWidth="10rem"
              className="bg-white/20 text-white"
            />
          </div>
          <div className="mt-12 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton
                key={index}
                lines={2}
                tone="soft"
                className="rounded-2xl border-white/25 bg-white/80"
                showHeader={false}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[84rem] px-4 py-16 md:px-8 space-y-12">
        <section className="rounded-[32px] bg-white/80 p-6 shadow-[0px_40px_120px_-60px_rgba(7,58,104,0.55)] ring-1 ring-[rgba(7,58,104,0.08)] backdrop-blur md:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 text-left">
              <BadgeSkeleton
                variant="outline"
                labelWidth="6rem"
                leadingIcon
                className="h-7"
              />
              <HeadingSkeleton
                lines={2}
                centered={false}
                className="max-w-xl"
              />
            </div>
            <BadgeSkeleton
              variant="outline"
              labelWidth="5rem"
              className="h-7 uppercase tracking-[0.2em]"
            />
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6">
              <CardSkeleton
                lines={3}
                tone="soft"
                className="rounded-[28px] border border-border/70 bg-white/90"
                showHeader={false}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <CardSkeleton
                    key={index}
                    lines={1}
                    tone="soft"
                    className="rounded-2xl border border-border/60 bg-white/90"
                    showHeader={false}
                  />
                ))}
              </div>
            </div>
            <CardSkeleton
              lines={4}
              tone="soft"
              className="rounded-[28px] border border-border/70 bg-white/90"
              showHeader={false}
            />
          </div>
        </section>

        <section className="space-y-10 rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
            <div className="space-y-6">
              <HeadingSkeleton lines={2} centered={false} />
              <Skeleton className="h-3 w-11/12 rounded-full" tone="muted" />
              <DirectoryProductListSkeleton
                count={6}
                columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                showMetaBadge
              />
            </div>
            <CardSkeleton
              lines={6}
              tone="soft"
              className="rounded-2xl border border-border/70 bg-white/90"
              showHeader={false}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
          <HeadingSkeleton lines={2} centered={false} />
          <Skeleton className="mt-2 h-3 w-3/4 rounded-full" tone="muted" />
          <div className="mt-8">
            <ProductListSkeleton count={4} />
          </div>
        </section>

        <DirectoryRadarDigestSkeleton />

        <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
          <HeadingSkeleton lines={2} centered={false} />
          <Skeleton className="mt-2 h-3 w-2/3 rounded-full" tone="muted" />
          <div className="mt-8 space-y-6">
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
      </div>
    </main>
  )
}
