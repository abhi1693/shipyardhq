import Link from "next/link"
import { Suspense } from "react"

import { UseCaseCard } from "@/components/molecules/UseCaseCard"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  TrafficSidebarStats,
  TrafficSidebarStatsSkeleton,
} from "@/components/templates/public/common/TrafficSidebarStats"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_PATH,
  USE_CASES_PATH,
  usecasePath,
} from "@/lib/routes"
import { getUseCasesPagePayload } from "@/lib/useCases/page-cache"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-static"
export const revalidate = 300

const PAGE_TITLE = "Use Cases"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Browse Shipyard by use case and discover the products built for your workflow.",
})

const USE_CASE_CARD_CLASSES =
  "border border-border/50 bg-white p-5 shadow-[0_18px_48px_-40px_rgba(7,58,104,0.35)] hover:border-[color:var(--brand-1)]/40"

export default async function UseCasesPage() {
  const { useCases, highlightUseCases } = await getUseCasesPagePayload()
  const primaryHighlights = highlightUseCases.slice(0, 8)

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix="use-cases"
        webPage={{ path: USE_CASES_PATH, name: PAGE_TITLE }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: PAGE_TITLE, path: USE_CASES_PATH },
          ],
        }}
      />

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
                    Discover use cases built for every launch
                  </h1>
                </div>
                {primaryHighlights.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {primaryHighlights.map((useCase) => (
                      <Link
                        key={useCase.id}
                        href={usecasePath(useCase.slug)}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-[color:var(--brand-1)]/40 hover:text-foreground"
                      >
                        <span className="truncate">{useCase.label}</span>
                        {typeof useCase.productCount === "number" ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {useCase.productCount.toLocaleString()}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
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
                    Submit your use case launch
                  </Link>
                </div>
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6">
              {useCases.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {useCases.map((useCase) => (
                    <UseCaseCard
                      key={useCase.id}
                      href={usecasePath(useCase.slug)}
                      label={useCase.label}
                      productCount={useCase.productCount}
                      className={USE_CASE_CARD_CLASSES}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center text-sm text-muted-foreground">
                  No use cases are available yet. Check back soon for the latest
                  workflows.
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
          </>
        }
      />
    </main>
  )
}
