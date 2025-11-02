import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { HomepageFeedSkeleton } from "@/components/templates/public/homepage/homepage-feed-section"
import { ProductUpdatesSkeleton } from "@/components/templates/public/homepage/product-updates"
import { SponsoredProductsSkeleton } from "@/components/templates/public/homepage/sponsored-products"

export function TagDetailSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-12 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2.6fr)_minmax(240px,0.9fr)]">
          <div className="flex flex-col gap-10">
            <HeroSkeleton />
            <Skeleton className="h-20 rounded-3xl border border-border/40 bg-white shadow-sm" />
            <ProductsSkeleton />
          </div>
          <aside className="flex w-full max-w-sm flex-col gap-6 lg:ml-auto">
            <SponsoredProductsSkeleton />
            <ProductUpdatesSkeleton />
          </aside>
        </div>
      </div>
    </main>
  )
}

function HeroSkeleton() {
  return (
    <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <div className="w-full space-y-4">
          <HeadingSkeleton lines={2} centered className="text-foreground" />
          <Skeleton className="mx-auto h-3 w-4/5 rounded-full" tone="muted" />
        </div>
        <Skeleton className="h-3 w-44 rounded-full" tone="muted" />
        <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <ButtonSkeleton size="lg" labelWidth="11rem" />
          <ButtonSkeleton size="lg" variant="outline" labelWidth="12rem" />
        </div>
      </div>
    </section>
  )
}

function ProductsSkeleton() {
  return (
    <section className="space-y-6">
      <HomepageFeedSkeleton />
    </section>
  )
}
