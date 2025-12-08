import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { SponsoredProductsSkeleton } from "@/components/templates/public/homepage/sponsored-products"
import {
  ProductUpvoteBadgeFallback,
  SimilarProductsFallback,
} from "./product-fallbacks"

export function PublicProductDetailSkeleton() {
  const productDetailsCard = (
    <Skeleton
      tone="soft"
      radius="lg"
      border="muted"
      inset
      className="space-y-4 rounded-2xl p-6 shadow-sm"
    >
      <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-2.5 w-28 rounded-full" tone="muted" />
            <Skeleton className="h-3 w-48 rounded-full" />
          </div>
        ))}
      </div>
    </Skeleton>
  )

  return (
    <main className="bg-white" aria-busy="true" aria-label="Loading product">
      <PublicTwoColumnLayout
        gapClassName="gap-8 lg:gap-10"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <section className="space-y-6 rounded-3xl border border-border bg-white px-4 py-6 shadow-sm sm:px-6 lg:px-8 lg:py-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-xl" tone="soft" />
                  <div className="space-y-3">
                    <HeadingSkeleton lines={1} centered={false} />
                    <Skeleton className="h-3 w-64 rounded-full" tone="muted" />
                    <Skeleton className="h-3 w-52 rounded-full" tone="muted" />
                    <div className="flex flex-wrap items-center gap-2">
                      <BadgeSkeleton variant="outline" labelWidth="5rem" />
                      <BadgeSkeleton variant="outline" labelWidth="6rem" />
                      <BadgeSkeleton variant="outline" labelWidth="4.5rem" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
                    <Skeleton className="h-3 w-44 rounded-full" tone="muted" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-28 rounded-full" tone="soft" />
                  <Skeleton className="h-9 w-24 rounded-full" tone="soft" />
                  <Skeleton className="h-9 w-32 rounded-full" tone="soft" />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-10 rounded-full border border-border/50"
                    tone="soft"
                  />
                ))}
              </div>
              <div className="lg:hidden">
                <ProductUpvoteBadgeFallback />
              </div>
            </section>

            <Skeleton className="h-72 rounded-3xl border border-border bg-white shadow-sm sm:h-[22rem]" />

            <Skeleton
              tone="soft"
              radius="lg"
              border="muted"
              inset
              className="space-y-3 rounded-2xl p-6 shadow-sm"
            >
              <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-72 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-4/5 rounded-full" tone="muted" />
              <Skeleton className="h-3 w-3/5 rounded-full" tone="muted" />
            </Skeleton>

            <div className="lg:hidden">{productDetailsCard}</div>

            <div className="space-y-3">
              <Skeleton className="h-2.5 w-16 rounded-full" tone="muted" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-7 w-20 rounded-full"
                    tone="soft"
                  />
                ))}
              </div>
            </div>
            <Skeleton className="h-16 rounded-2xl border border-border bg-white" />
            <SimilarProductsFallback />
          </>
        }
        sidebar={
          <div className="flex flex-col gap-6">
            <div className="hidden lg:block">
              <ProductUpvoteBadgeFallback />
            </div>
            <div className="hidden lg:block">{productDetailsCard}</div>
            <div className="hidden lg:block">
              <SponsoredProductsSkeleton />
            </div>
          </div>
        }
      />
    </main>
  )
}
