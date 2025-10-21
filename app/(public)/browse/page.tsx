import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/molecules/empty-state"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { DirectoryHowItWorks } from "@/components/organisms/directory/DirectoryHowItWorks"
import { BrowseFeaturedCarousel } from "@/components/organisms/BrowseFeaturedCarousel"
import { ProductUpdatesFeed } from "@/components/molecules/ProductUpdatesFeed"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  RANK_IN_PUBLIC_PATH,
  usecasePath,
} from "@/lib/routes"
import { getPublicUseCaseMeta } from "@/actions/public/use-cases/actions"
import {
  getBrowsePagePayload,
  type BrowseSort,
  type BrowsePageFilters,
} from "@/lib/browse/cache"

const baseMetadata = buildPageMetadata({
  title: "Browse Products",
  description: "Explore tools, startups, and products by use case or category.",
})

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const useCase = resolveSingle(params.useCase)

  if (useCase && useCase !== "__all__") {
    const useCaseMeta = await getPublicUseCaseMeta(useCase)
    if (useCaseMeta && useCaseMeta.productCount > 0) {
      return {
        ...baseMetadata,
        alternates: { canonical: usecasePath(useCaseMeta.slug) },
      }
    }
  }

  return {
    ...baseMetadata,
    alternates: { canonical: BROWSE_PATH },
  }
}

const browseMetrics = [
  {
    key: "totalProducts" as const,
    label: "Directory listings",
  },
  {
    key: "totalCreators" as const,
    label: "Builders featured",
  },
  {
    key: "totalUpvotes" as const,
    label: "Community upvotes",
  },
  {
    key: "totalInsights" as const,
    label: "Insights generated",
  },
] as const

type StrOrArr = string | string[] | undefined

interface BrowseSearchParams {
  useCase?: StrOrArr
  category?: StrOrArr
  verified?: StrOrArr
  sort?: StrOrArr
  page?: StrOrArr
  q?: StrOrArr
}

const resolveSingle = (value: StrOrArr) =>
  Array.isArray(value) ? value[0] : value

const isBrowseSort = (value: string | undefined): value is BrowseSort =>
  value === "new" || value === "trending" || value === "votes" || value === "az"

const parseSearchParams = (params: BrowseSearchParams): BrowsePageFilters => {
  const useCaseRaw = resolveSingle(params.useCase)
  const categoryRaw = resolveSingle(params.category)
  const sortRaw = resolveSingle(params.sort)
  const pageRaw = Number.parseInt(resolveSingle(params.page) ?? "1", 10)
  const queryRaw = resolveSingle(params.q)?.trim()

  return {
    useCase:
      useCaseRaw && useCaseRaw !== "__all__" ? useCaseRaw.trim() : undefined,
    category:
      categoryRaw && categoryRaw !== "__all__" ? categoryRaw.trim() : undefined,
    verified: resolveSingle(params.verified) === "true",
    sort: isBrowseSort(sortRaw) ? sortRaw : "new",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    query: queryRaw && queryRaw.length ? queryRaw : undefined,
  }
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>
}) {
  const params = await searchParams
  const parsedFilters = parseSearchParams(params)

  const {
    filters: normalizedFilters,
    products,
    hasMore,
    featured,
    useCases,
    categories,
    stats,
    latestProductUpdates,
    filterSummary,
    headline,
    hasActiveFilters,
  } = await getBrowsePagePayload(parsedFilters)

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeader
            stats={stats}
            eyebrow="Directory browse"
            title="Browse the Shipyard launch catalog"
            description="We run the homepage spotlight, curate featured campaigns, and track momentum across editor picks, new arrivals, the live leaderboard, and head-to-head live launch battles."
            primaryAction={{
              label: "Submit your launch",
              href: MEMBER_PRODUCTS_PATH,
            }}
            secondaryAction={{
              label: "Join the live showdown",
              href: RANK_IN_PUBLIC_PATH,
              variant: "outline",
            }}
            metrics={browseMetrics}
          />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col gap-8">
              <BrowseFilterBar
                useCases={useCases}
                categories={categories}
                current={{
                  useCase: normalizedFilters.useCase,
                  category: normalizedFilters.category,
                  sort: normalizedFilters.sort,
                  verified: normalizedFilters.verified,
                }}
              />

              <section className="rounded-3xl border border-border/80 bg-background/85 p-6 shadow-sm shadow-black/5 md:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                      {headline}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {filterSummary.join(" • ")}
                    </p>
                  </div>
                  {hasActiveFilters ? (
                    <Link
                      href={BROWSE_PATH}
                      className="text-sm font-semibold text-[color:var(--brand-1)] underline-offset-4 hover:underline"
                    >
                      Reset filters
                    </Link>
                  ) : null}
                </div>

                <div className="mt-6">
                  {products.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20">
                      <EmptyState
                        title="No results in sight"
                        description="Adjust filters or jump into another category to keep your search going."
                        actionLabel="Reset filters"
                        actionHref={BROWSE_PATH}
                      />
                    </div>
                  ) : (
                    <ProductGridClient
                      initialProducts={products}
                      initialHasMore={hasMore}
                      initialPage={normalizedFilters.page + 1}
                      searchParams={{
                        useCase: normalizedFilters.useCase,
                        category: normalizedFilters.category,
                        verified: normalizedFilters.verified,
                        sort: normalizedFilters.sort,
                        q: normalizedFilters.query,
                      }}
                    />
                  )}
                </div>
              </section>
            </div>

            <aside className="flex flex-col gap-8">
              <BrowseFeaturedCarousel products={featured} />
              <DirectoryCategoryRail categories={categories} />
              <DirectoryPromoCard
                eyebrow="Need more reach?"
                title="Secure premium placement before launch day"
                description="Upgrade to sponsored placements to lock in homepage spotlights and featured tiles ahead of your drop."
                cta={{
                  label: "Explore placement plans",
                  href: PRICING_PATH,
                  variant: "ghost",
                }}
                subtleCta={{
                  label: "See what gets featured",
                  href: `${BROWSE_PATH}?sort=trending`,
                }}
              />
              <DirectoryPromoCard
                eyebrow="Placement transparency"
                title="Understand how rankings take shape"
                description="Learn the signals, editorial calls, and sponsorship slots that determine placement across Shipyard listings."
                cta={{
                  label: "Explore the methodology",
                  href: LEADERBOARD_GUIDE_PATH,
                }}
                subtleCta={{
                  label: "Watch the live standings",
                  href: LEADERBOARD_PATH,
                }}
              />
              <ProductUpdatesFeed updates={latestProductUpdates} />
            </aside>
          </div>

          <DirectoryHowItWorks />
        </div>
      </div>
    </main>
  )
}
