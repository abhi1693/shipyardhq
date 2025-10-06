export const revalidate = 60

import Link from "next/link"

import {
  getCategories,
  getUseCasesWithCounts,
} from "@/actions/admin/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { getProducts } from "@/actions/public/products/featured"
import { getLeaderboardStats } from "@/actions/public/leaderboard/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { DirectoryPromoCard } from "@/components/organisms/directory/PromoCard"
import { DirectoryHowItWorks } from "@/components/organisms/directory/DirectoryHowItWorks"
import { DirectoryOutro } from "@/components/organisms/directory/DirectoryOutro"
import { BrowseFeaturedCarousel } from "@/components/organisms/BrowseFeaturedCarousel"
import { buildPageMetadata } from "@/lib/metadata"
import { pluralize } from "@/lib/pluralize"
import {
  BROWSE_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
} from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Browse Products",
  description:
    "Chart your course through tools, startups, and products by use case or category.",
})

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

const sortLabelMap: Record<string, string> = {
  new: "Newest",
  trending: "Trending",
  votes: "Most Upvoted",
  az: "A–Z",
}

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

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>
}) {
  const params = await searchParams
  const useCase = resolveSingle(params.useCase)
  const category = resolveSingle(params.category)
  const verified = resolveSingle(params.verified)
  const sort =
    (resolveSingle(params.sort) as "new" | "trending" | "votes" | "az") ??
    "new"
  const page = resolveSingle(params.page) ?? "1"
  const q = resolveSingle(params.q)?.trim()

  const [browseResult, featured, useCases, categories, stats] =
    await Promise.all([
      getBrowseProducts({
        useCaseSlug: useCase === "__all__" ? undefined : useCase,
        categorySlug: category === "__all__" ? undefined : category,
        verified: verified === "true",
        sort,
        page: parseInt(page, 10),
        query: q || undefined,
      }),
      getProducts("featured"),
      getUseCasesWithCounts(),
      getCategories({
        include: { _count: { select: { products: true } } },
        orderBy: { createdAt: "desc" },
      }),
      getLeaderboardStats(),
    ])

  const { products, hasMore } = browseResult
  const sortLabel = sortLabelMap[sort] ?? sortLabelMap.new

  const selectedUseCaseLabel = useCases.find(
    (entry) => entry.slug === useCase,
  )?.label
  const selectedCategoryLabel = categories.find(
    (entry) => entry.slug === category,
  )?.name

  const hasActiveFilters = Boolean(
    (useCase && useCase !== "__all__") ||
      (category && category !== "__all__") ||
      verified === "true" ||
      (q && q.length > 0) ||
      sort !== "new",
  )

  const filterSummary: string[] = [
    `Showing ${products.length} ${pluralize(products.length, "result")}`,
    `Sorted by ${sortLabel}`,
  ]

  if (selectedUseCaseLabel) {
    filterSummary.push(`Use case: ${selectedUseCaseLabel}`)
  }

  if (selectedCategoryLabel) {
    filterSummary.push(`Category: ${selectedCategoryLabel}`)
  }

  if (verified === "true") {
    filterSummary.push("Verified makers only")
  }

  const headline = q
    ? `Searching “${q}”`
    : selectedCategoryLabel
      ? `${selectedCategoryLabel} launches`
      : selectedUseCaseLabel
        ? `${selectedUseCaseLabel} playbook`
        : verified === "true"
          ? "Verified launches"
          : "Browse every Shipyard launch"

  const sidebarCategories = [...categories].sort((a, b) => {
    const aCount = a._count?.products ?? 0
    const bCount = b._count?.products ?? 0
    return bCount - aCount
  })

  return (
    <main className="relative isolate bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,252,0.92)40%,rgba(233,243,251,0.9))] dark:bg-[linear-gradient(180deg,rgba(6,18,36,0.92),rgba(4,24,43,0.92)40%,rgba(9,32,55,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_120%_at_0%_0%,var(--brand-1)/0.08,transparent_60%),radial-gradient(110%_140%_at_100%_-10%,var(--brand-3)/0.08,transparent_70%)]"
      />

      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-12">
          <DirectoryHeader
            stats={stats}
            eyebrow="Directory browse"
            title="Navigate the Shipyard launch catalog"
            description="We run the homepage spotlight, curate featured campaigns, and track momentum across editor picks, new arrivals, and the live leaderboard."
            primaryAction={{
              label: "Submit your launch",
              href: MEMBER_PRODUCTS_PATH,
            }}
            secondaryAction={{
              label: "Watch the leaderboard",
              href: LEADERBOARD_PATH,
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
                  useCase,
                  category,
                  sort,
                  verified: verified === "true",
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
                        description="Adjust filters or jump into another category to keep your scouting run going."
                        actionLabel="Reset filters"
                        actionHref={BROWSE_PATH}
                      />
                    </div>
                  ) : (
                    <ProductGridClient
                      initialProducts={products}
                      initialHasMore={hasMore}
                      initialPage={2}
                      searchParams={{
                        useCase: useCase === "__all__" ? undefined : useCase,
                        category:
                          category === "__all__" ? undefined : category,
                        verified: verified === "true",
                        sort,
                        q: q || undefined,
                      }}
                    />
                  )}
                </div>
              </section>
            </div>

            <aside className="flex flex-col gap-8">
              <BrowseFeaturedCarousel products={featured} />
              <DirectoryCategoryRail categories={sidebarCategories} />
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
            </aside>
          </div>

          <DirectoryHowItWorks />
          <DirectoryOutro />
        </div>
      </div>
    </main>
  )
}
