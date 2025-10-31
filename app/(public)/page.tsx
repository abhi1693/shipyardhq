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
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
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
      <PublicTwoColumnLayout
        className="pb-24 pt-10"
        mainClassName="gap-12"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <Suspense fallback={<DirectoryHeaderSkeleton />}>
              <DirectoryHeaderSection />
            </Suspense>
            <Suspense fallback={<HomepageFeedSkeleton />}>
              <HomepageFeedSection view={feedView} />
            </Suspense>
            <DirectoryHowItWorks />
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </>
        }
      />
    </main>
  )
}
