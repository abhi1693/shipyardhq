import { Suspense } from "react"

import { HomepageJsonLd } from "@/components/templates/public/homepage/json-ld"
import {
  DirectoryHeaderSection,
  DirectoryHeaderSkeleton,
} from "@/components/templates/public/homepage/directory-header"
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
    <main className="relative isolate bg-[#f5f7fb]">
      <HomepageJsonLd />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-10 md:px-6">
        <Suspense fallback={<DirectoryHeaderSkeleton />}>
          <DirectoryHeaderSection />
        </Suspense>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,0.85fr)]">
          <div className="flex flex-col gap-10">
            <Suspense fallback={<HomepageFeedSkeleton />}>
              <HomepageFeedSection view={feedView} />
            </Suspense>
          </div>

          <aside className="flex w-full max-w-sm flex-col gap-6 lg:sticky lg:top-24 lg:ml-auto">
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </aside>
        </div>

        <div className="mt-14">
          <DirectoryHowItWorks />
        </div>
      </div>
    </main>
  )
}
