import { Suspense } from "react"

import { HomepageJsonLd } from "@/components/templates/public/homepage/json-ld"
import {
  DirectoryHeaderSection,
  DirectoryHeaderSkeleton,
} from "@/components/templates/public/homepage/directory-header"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import { DirectoryHowItWorks } from "@/components/organisms/directory/DirectoryHowItWorks"
import {
  HomepageFeedSection,
  HomepageFeedSkeleton,
} from "@/components/templates/public/homepage/homepage-feed-section"
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
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <Suspense fallback={<DirectoryHeaderSkeleton />}>
          <DirectoryHeaderSection />
        </Suspense>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-12">
            <Suspense fallback={<HomepageFeedSkeleton />}>
              <HomepageFeedSection view={feedView} />
            </Suspense>
          </div>

          <aside className="flex flex-col gap-8 lg:sticky lg:top-24">
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
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
