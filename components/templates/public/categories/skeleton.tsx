import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function CategoriesPageSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-16">
          <section className="rounded-3xl border border-border bg-white px-6 py-12 shadow-sm md:px-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <BadgeSkeleton
                  variant="outline"
                  labelWidth="12rem"
                  leadingIcon
                  className="h-8"
                />
                <div className="space-y-4">
                  <HeadingSkeleton lines={2} centered={false} />
                  <Skeleton className="h-3 w-4/5 rounded-full" tone="muted" />
                  <Skeleton className="h-3 w-2/3 rounded-full" tone="muted" />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <ButtonSkeleton size="lg" labelWidth="10rem" />
                  <ButtonSkeleton
                    size="lg"
                    variant="outline"
                    labelWidth="12rem"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <BadgeSkeleton
                      // eslint-disable-next-line react/no-array-index-key -- decorative only
                      key={index}
                      variant="outline"
                      labelWidth="7rem"
                      className="h-7"
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <CardSkeleton
                    // eslint-disable-next-line react/no-array-index-key -- decorative only
                    key={index}
                    tone="soft"
                    radius="lg"
                    lines={2}
                    showHeader={false}
                    className="border-border bg-white/95"
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-white px-6 py-10 shadow-sm md:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <HeadingSkeleton lines={2} centered={false} />
                <Skeleton className="h-3 w-2/3 rounded-full" tone="muted" />
              </div>
              <BadgeSkeleton
                variant="outline"
                labelWidth="9rem"
                className="h-7"
              />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <CardSkeleton
                  // eslint-disable-next-line react/no-array-index-key -- decorative only
                  key={index}
                  tone="soft"
                  radius="lg"
                  lines={3}
                  showHeader={false}
                  className="border-border bg-white/95"
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card/95 px-6 py-12 shadow-[0_24px_80px_-50px_rgba(7,58,104,0.5)] backdrop-blur md:px-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <BadgeSkeleton
                variant="outline"
                labelWidth="11rem"
                leadingIcon
                className="h-7"
              />
              <HeadingSkeleton lines={2} centered className="text-foreground" />
              <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-2/3 rounded-full" tone="muted" />
              <ButtonSkeleton size="lg" variant="outline" labelWidth="12rem" />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
