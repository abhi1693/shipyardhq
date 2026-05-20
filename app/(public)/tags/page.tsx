import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/molecules/empty-state"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  DirectoryHighlightsSidebar,
  DirectoryHighlightsSidebarSkeleton,
} from "@/components/templates/public/homepage/directory-highlights"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import { TagDirectoryList } from "@/components/templates/public/tags/index/tag-directory-list"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_PATH,
  TAGS_PATH,
} from "@/lib/routes"
import { getTagsIndexPayload } from "@/lib/tags/page-cache"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-dynamic"

const PAGE_TITLE = "Browse Tags"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Explore Shipyard products by their top keywords and discover new tools aligned with your interests.",
  canonical: TAGS_PATH,
})

type TagsSearchParams = {
  page?: string | string[]
}

export default async function TagsIndexPage({
  searchParams,
}: {
  searchParams: Promise<TagsSearchParams>
}) {
  await searchParams

  const payload = await getTagsIndexPayload()
  const { initialItems, hasMore, totalTags, pageSize } = payload
  const hasTags = initialItems.length > 0
  const listResetKey =
    initialItems.map((tag) => tag.slug).join("|") || "tags-empty"

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix="tags"
        webPage={{ path: TAGS_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: TAGS_PATH },
          ],
        }}
      />
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="space-y-12"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Discover every keyword powering launches
                  </h1>
                  <p className="text-base text-muted-foreground">
                    Browse tags sorted by live product count and see which
                    themes are shaping the Shipyard community.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
                  <Link
                    href={BROWSE_PATH}
                    className={`${HERO_PRIMARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Browse trending launches
                  </Link>
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={`${HERO_SECONDARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Submit your tagged launch
                  </Link>
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6" data-testid="tag-directory-section">
              {hasTags ? (
                <TagDirectoryList
                  key={`${pageSize}:${listResetKey}`}
                  initialItems={initialItems}
                  initialHasMore={hasMore}
                  pageSize={pageSize}
                  totalTags={totalTags}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-border/40 bg-white/70 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                  <EmptyState
                    title="No tags yet"
                    description="Once products add keywords, you’ll be able to explore them here."
                  />
                </div>
              )}
            </section>
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<TrafficSidebarStatsSkeleton />}>
              <TrafficSidebarStats />
            </Suspense>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
            <Suspense fallback={<DirectoryHighlightsSidebarSkeleton />}>
              <DirectoryHighlightsSidebar />
            </Suspense>
            <AffiliateLinkCard />
          </>
        }
      />
    </main>
  )
}
