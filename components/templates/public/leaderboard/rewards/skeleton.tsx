import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { TrafficSidebarStatsSkeleton } from "@/components/templates/public/common/TrafficSidebarStats"
import { SponsoredProductsSkeleton } from "@/components/templates/public/homepage/sponsored-products"
import { ProductUpdatesSkeleton } from "@/components/templates/public/homepage/product-updates"

export function RewardsLeaderboardSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="gap-10"
        sidebarClassName="lg:sticky lg:top-24 gap-6"
        main={
          <>
            <RewardsHeroSkeleton />
            <CardSkeleton
              tone="soft"
              radius="lg"
              lines={10}
              showFooter
              className="border border-border/60 bg-white/95 shadow-[0_20px_70px_-60px_rgba(7,68,134,0.35)]"
            />
          </>
        }
        sidebar={
          <>
            <TrafficSidebarStatsSkeleton />
            <div className="hidden lg:block">
              <SponsoredProductsSkeleton />
            </div>
            <ProductUpdatesSkeleton />
          </>
        }
      />
    </main>
  )
}

function RewardsHeroSkeleton() {
  return (
    <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <Skeleton className="h-16 w-16 rounded-2xl border border-border/40 bg-muted/40 shadow-[0_18px_42px_-28px_rgba(7,68,134,0.35)]" />
        <div className="w-full space-y-4">
          <HeadingSkeleton lines={2} centered className="text-foreground" />
          <Skeleton className="mx-auto h-3 w-4/5 rounded-full" tone="muted" />
        </div>
        <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <ButtonSkeleton size="lg" labelWidth="10rem" />
          <ButtonSkeleton size="lg" variant="outline" labelWidth="12rem" />
        </div>
        <div className="grid w-full max-w-3xl grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-16 rounded-2xl border border-border/50 bg-muted/30 shadow-[0_20px_70px_-60px_rgba(7,68,134,0.35)]"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
