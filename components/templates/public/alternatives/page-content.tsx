import { Suspense } from "react"
import Link from "next/link"

import {
  ALTERNATIVE_CATALOG_PAGE_SIZE,
  getAlternativeCatalogPage,
} from "@/actions/public/alternatives/actions"
import { AlternativeCatalogGridClient } from "@/components/molecules/AlternativeCatalogGridClient"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import HeroStickyBanner from "@/components/layout/HeroStickyBanner"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"

export async function AlternativesPageContent() {
  const { items, hasMore } = await getAlternativeCatalogPage({
    page: 1,
    pageSize: ALTERNATIVE_CATALOG_PAGE_SIZE,
  })

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="space-y-12"
        sidebarClassName="lg:sticky lg:top-24"
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

            <HeroStickyBanner wrapperClassName="px-0" innerClassName="w-full" />

            <section className="space-y-6">
              <AlternativeCatalogGridClient
                initialItems={items}
                initialHasMore={hasMore}
                initialPage={2}
                pageSize={ALTERNATIVE_CATALOG_PAGE_SIZE}
                gridClassName="grid-cols-1 sm:grid-cols-1 xl:grid-cols-1"
              />
            </section>
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>

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
