import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function PricingPageSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="border-b border-border/40 bg-muted/30 py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center md:px-8">
          <BadgeSkeleton
            variant="outline"
            labelWidth="10rem"
            leadingIcon
            className="h-8"
          />
          <HeadingSkeleton lines={3} centered className="text-foreground" />
          <div className="space-y-2">
            <Skeleton className="mx-auto h-3 w-3/4 rounded-full" tone="muted" />
            <Skeleton className="mx-auto h-3 w-2/3 rounded-full" tone="muted" />
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <ButtonSkeleton size="lg" labelWidth="9rem" />
            <ButtonSkeleton size="lg" variant="outline" labelWidth="10rem" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[84rem] px-4 py-16 md:px-8">
        <div className="space-y-12">
          <section className="space-y-8">
            <HeadingSkeleton lines={2} centered={false} />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CardSkeleton
                  // eslint-disable-next-line react/no-array-index-key -- decorative only
                  key={index}
                  tone="soft"
                  radius="lg"
                  lines={6}
                  showFooter
                  className="border border-border bg-white"
                />
              ))}
            </div>
          </section>

          <CardSkeleton
            tone="soft"
            radius="lg"
            lines={6}
            showFooter
            className="border border-border bg-white"
          />

          <section className="space-y-6">
            <HeadingSkeleton lines={2} centered={false} />
            <div className="space-y-3 rounded-2xl border border-border bg-white p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key -- decorative only
                  key={index}
                  className="grid gap-4 border-b border-border/60 pb-4 last:border-b-0 md:grid-cols-[1.2fr_1fr]
                  "
                >
                  <Skeleton className="h-3 w-full rounded-full" tone="muted" />
                  <Skeleton className="h-3 w-1/2 rounded-full" tone="muted" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
            <HeadingSkeleton lines={2} centered />
            <Skeleton className="mx-auto mt-3 h-3 w-3/4 rounded-full" tone="muted" />
            <Skeleton className="mx-auto mt-2 h-3 w-2/3 rounded-full" tone="muted" />
            <div className="mt-6 flex justify-center">
              <ButtonSkeleton size="lg" labelWidth="10rem" />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
