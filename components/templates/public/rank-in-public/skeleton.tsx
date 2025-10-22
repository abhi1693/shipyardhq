import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function RankInPublicSkeleton() {
  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <section className="rounded-3xl border border-border bg-white px-6 py-12 shadow-sm md:px-10">
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
              <BadgeSkeleton
                variant="outline"
                labelWidth="11rem"
                leadingIcon
                className="h-8"
              />
              <HeadingSkeleton lines={2} centered />
              <Skeleton className="h-3 w-3/4 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-2/3 rounded-full" tone="muted" />
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <ButtonSkeleton size="lg" labelWidth="9rem" />
                <ButtonSkeleton size="lg" variant="outline" labelWidth="10rem" />
              </div>
            </div>
          </section>

          <CardSkeleton
            tone="soft"
            radius="lg"
            lines={6}
            showFooter
            className="border border-border bg-white"
          />
        </div>
      </div>
    </main>
  )
}
