import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function LeaderboardGuideSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="py-24 lg:py-28">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="relative mx-auto flex flex-col gap-12 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-6">
              <BadgeSkeleton
                variant="outline"
                labelWidth="11rem"
                leadingIcon
                className="h-8"
              />
              <HeadingSkeleton
                lines={2}
                centered={false}
                className="max-w-2xl"
              />
              <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-2/3 rounded-full" tone="muted" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <ButtonSkeleton size="lg" labelWidth="10rem" />
                <ButtonSkeleton
                  size="lg"
                  variant="outline"
                  labelWidth="14rem"
                />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <CardSkeleton
                  key={index}
                  lines={2}
                  tone="soft"
                  className="rounded-3xl border border-border/70 bg-white/92"
                  showHeader={false}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="space-y-3 text-center">
              <HeadingSkeleton
                lines={1}
                centered
                className="max-w-xl mx-auto"
              />
              <Skeleton
                className="mx-auto h-3 w-3/4 rounded-full"
                tone="muted"
              />
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
              <CardSkeleton
                lines={5}
                tone="soft"
                className="rounded-3xl border border-border/70 bg-white/92"
                showHeader={false}
              />
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <CardSkeleton
                    key={index}
                    lines={3}
                    tone="soft"
                    className="rounded-2xl border border-border/70 bg-white/90"
                    showHeader={false}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="space-y-10">
            <div className="space-y-2 text-center">
              <HeadingSkeleton
                lines={1}
                centered
                className="max-w-2xl mx-auto"
              />
              <Skeleton
                className="mx-auto h-3 w-2/3 rounded-full"
                tone="muted"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CardSkeleton
                  key={index}
                  lines={4}
                  tone="soft"
                  className="rounded-2xl border border-border/70 bg-white/92"
                  showHeader={false}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-[84rem] px-4 md:px-8">
          <div className="space-y-8">
            <HeadingSkeleton lines={1} centered={false} className="max-w-md" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <CardSkeleton
                  key={index}
                  lines={3}
                  tone="soft"
                  className="rounded-2xl border border-border/70 bg-white/92"
                  showHeader={false}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
