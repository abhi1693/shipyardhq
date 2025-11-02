import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { SponsoredProductsSkeleton } from "@/components/templates/public/homepage/sponsored-products"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"

export function CategoriesPageSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="space-y-12"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <HeroSkeleton />
            <Skeleton className="h-16 w-full rounded-3xl border border-border/40 bg-white shadow-[0_24px_80px_-60px_rgba(7,58,104,0.35)]" />
            <CategoriesSkeleton />
          </>
        }
        sidebar={
          <>
            <SponsoredProductsSkeleton />
            <CtaSkeleton />
          </>
        }
      />
    </main>
  )
}

function HeroSkeleton() {
  return (
    <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <div className="space-y-4">
          <HeadingSkeleton lines={2} centered className="text-foreground" />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-7 w-24 rounded-full"
              tone="muted"
            />
          ))}
        </div>
        <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <ButtonSkeleton size="lg" labelWidth="12rem" />
          <ButtonSkeleton size="lg" variant="outline" labelWidth="14rem" />
        </div>
      </div>
    </section>
  )
}

function CategoriesSkeleton() {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton
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
  )
}

function CtaSkeleton() {
  return (
    <section className="rounded-3xl border border-border/40 bg-white px-6 py-8 text-center shadow-[0_24px_80px_-60px_rgba(7,58,104,0.35)]">
      <div className="space-y-3">
        <HeadingSkeleton lines={2} centered className="text-foreground" />
        <Skeleton className="mx-auto h-3 w-3/4 rounded-full" tone="muted" />
      </div>
      <ButtonSkeleton size="lg" variant="outline" labelWidth="12rem" className="mt-6" />
    </section>
  )
}
