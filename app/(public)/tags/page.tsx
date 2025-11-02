import { Suspense } from "react"

import { TagsIndexPageContent } from "@/components/templates/public/tags/index/page-content"
import { buildPageMetadata } from "@/lib/metadata"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { Skeleton } from "@/components/atoms/skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import { SponsoredProductsSkeleton } from "@/components/templates/public/homepage/sponsored-products"

export const metadata = buildPageMetadata({
  title: "Browse Tags",
  description:
    "Explore Shipyard products by their top keywords and discover new tools aligned with your interests.",
})

export default function TagsIndexPage(
  props: Parameters<typeof TagsIndexPageContent>[0],
) {
  return (
    <Suspense fallback={<TagsIndexPageSkeleton />}>
      <TagsIndexPageContent {...props} />
    </Suspense>
  )
}

function TagsIndexPageSkeleton() {
  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="space-y-12"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <TagsHeroSkeleton />
            <Skeleton className="h-16 w-full rounded-3xl border border-border/40 bg-white shadow-[0_24px_80px_-60px_rgba(7,58,104,0.35)]" />
            <TagListSkeleton />
          </>
        }
        sidebar={<SponsoredProductsSkeleton />}
      />
    </main>
  )
}

function TagsHeroSkeleton() {
  return (
    <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <div className="space-y-4">
          <Skeleton className="mx-auto h-3 w-32 rounded-full" tone="muted" />
          <HeadingSkeleton lines={2} centered className="text-foreground" />
          <Skeleton className="mx-auto h-3 w-3/4 rounded-full" tone="muted" />
        </div>
        <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
          <ButtonSkeleton size="lg" labelWidth="12rem" />
          <ButtonSkeleton size="lg" variant="outline" labelWidth="14rem" />
        </div>
      </div>
    </section>
  )
}

function TagListSkeleton() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <HeadingSkeleton lines={1} className="h-7 w-48" />
          <Skeleton className="h-3 w-64 rounded-full" tone="muted" />
        </div>
        <Skeleton className="h-4 w-24 rounded-full" tone="muted" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProductFeedCardSkeleton
            key={`tag-directory-feed-skeleton-${index}`}
            showCategory={false}
            showBadges={false}
            showMetaBadge
          />
        ))}
      </div>
    </section>
  )
}
