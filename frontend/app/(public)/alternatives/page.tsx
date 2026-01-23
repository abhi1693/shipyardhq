import Link from "next/link"
import { Suspense } from "react"

import { AlternativeCatalogGridClient } from "@/components/molecules/AlternativeCatalogGridClient"
import AffiliateLinkCard from "@/components/molecules/AffiliateLinkCard"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import {
  DirectoryHighlightsSidebar,
  DirectoryHighlightsSidebarSkeleton,
} from "@/components/templates/public/homepage/directory-highlights"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { getAlternativesIndexPayload } from "@/lib/alternatives/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import {
  ALTERNATIVES_PATH,
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"

export const dynamic = "force-static"
export const revalidate = 300

const PAGE_TITLE = "Browse SaaS Alternatives"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: "Explore the best alternatives to popular SaaS tools.",
})

export default async function AlternativesPage() {
  const { initialItems, initialHasMore, pageSize } =
    await getAlternativesIndexPayload()
  const hasAlternatives = initialItems.length > 0
  const listResetKey =
    initialItems.map((item) => item.slug).join("|") || "alternatives-empty"

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix="alternatives"
        webPage={{ path: ALTERNATIVES_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: ALTERNATIVES_PATH },
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
                    Discover the best alternatives for every launch
                  </h1>
                  <p className="text-base text-muted-foreground sm:text-lg">
                    Compare vetted third-party tools founders benchmark against
                    Shipyard launches. Spot adjacent options, explore category
                    coverage, and map your competitive landscape in one curated
                    catalog.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
                  <Link
                    href={BROWSE_PATH}
                    className={`${HERO_PRIMARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Browse every launch
                  </Link>
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={`${HERO_SECONDARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Submit your alternative
                  </Link>
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6">
              {hasAlternatives ? (
                <AlternativeCatalogGridClient
                  key={`${pageSize}:${listResetKey}`}
                  initialItems={initialItems}
                  initialHasMore={initialHasMore}
                  initialPage={2}
                  pageSize={pageSize}
                  gridClassName="grid-cols-1 sm:grid-cols-1 xl:grid-cols-1"
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-border/40 bg-white/70 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                  No alternatives are available yet. Check back soon as makers
                  map new products into the catalog.
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

            <section className="rounded-3xl border border-border/40 bg-white px-6 py-8 text-center shadow-[0_24px_80px_-60px_rgba(7,58,104,0.35)]">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Spot a better fit we&apos;re missing?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Nominate the go-to tools founders compare against Shipyard
                  launches. We&apos;ll verify the matchup, highlight your
                  recommendation, and keep the catalog sharp for the community.
                </p>
                <a
                  href="mailto:support@shipyardhq.dev"
                  className={`${HERO_SECONDARY_BUTTON_CLASSES} w-full justify-center`}
                >
                  Pitch an alternative
                </a>
              </div>
            </section>
          </>
        }
      />
    </main>
  )
}
