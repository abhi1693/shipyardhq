import { Suspense } from "react"

import { HomepageJsonLd } from "@/components/templates/public/homepage/json-ld"
import {
  DirectoryHeaderSection,
  DirectoryHeaderSkeleton,
} from "@/components/templates/public/homepage/directory-header"
import {
  CategoryRailSection,
  CategoryRailSkeleton,
} from "@/components/templates/public/homepage/category-rail"
import {
  RadarDigestSection,
  RadarDigestSkeleton,
} from "@/components/templates/public/homepage/radar-digest"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import {
  LaunchSpotlightPromo,
  InsightsPromo,
} from "@/components/templates/public/homepage/promos"
import { DirectoryHowItWorks } from "@/components/organisms/directory/DirectoryHowItWorks"
import {
  HomepageFeedSection,
  HomepageFeedSkeleton,
} from "@/components/templates/public/homepage/homepage-feed-section"
import { HomepageContextStrip } from "@/components/templates/public/homepage/context-strip"
import { resolveHomepageFeedView } from "@/lib/homepage/feed-views"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const feedView = resolveHomepageFeedView(resolvedSearchParams)

  return (
    <main className="relative isolate bg-white">
      <HomepageJsonLd />
      <div className="relative mx-auto w-full max-w-[90rem] px-4 pb-24 pt-12 sm:px-6 md:px-8 lg:px-12">
        <Suspense fallback={<DirectoryHeaderSkeleton />}>
          <DirectoryHeaderSection />
        </Suspense>

        <HomepageContextStrip />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(296px,1fr)]">
          <div className="flex flex-col gap-12">
            <Suspense fallback={<HomepageFeedSkeleton />}>
              <HomepageFeedSection view={feedView} />
            </Suspense>
          </div>

          <aside className="flex flex-col gap-8 lg:sticky lg:top-24">
            <Suspense fallback={<CategoryRailSkeleton />}>
              <CategoryRailSection />
            </Suspense>
            <LaunchSpotlightPromo />
            <Suspense fallback={<RadarDigestSkeleton />}>
              <RadarDigestSection />
            </Suspense>
            <InsightsPromo />
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </aside>
        </div>

        <div className="mt-16">
          <DirectoryHowItWorks />
        </div>
      </div>
    </main>
  )
}
