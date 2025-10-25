import { Search } from "lucide-react"

import {
  ALTERNATIVE_CATALOG_PAGE_SIZE,
  getAlternativeCatalogPage,
  getAlternativeCatalogStats,
} from "@/actions/public/alternatives/actions"
import { AlternativeCatalogGridClient } from "@/components/molecules/AlternativeCatalogGridClient"
import { Input } from "@/components/atoms/input"
import DirectoryHeader from "@/components/organisms/directory/DirectoryHeader"
import {
  BROWSE_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"

type SearchParamsRecord = Record<string, string | string[] | undefined>

const resolveSingle = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export async function AlternativesPageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>
}) {
  const params = await searchParams
  const query = resolveSingle(params.q)?.trim() || undefined

  const [catalogStats, catalogPage] = await Promise.all([
    getAlternativeCatalogStats(),
    getAlternativeCatalogPage({
      page: 1,
      pageSize: ALTERNATIVE_CATALOG_PAGE_SIZE,
      query,
    }),
  ])

  const { items, hasMore } = catalogPage

  const heroStats = {
    totalProducts: catalogStats.totalAlternatives,
    totalCreators: catalogStats.linkedProducts,
    totalUpvotes: catalogStats.categoriesCovered,
    totalInsights: catalogStats.totalPairings,
    topScore: catalogStats.totalAlternatives,
  }

  const heroMetrics = [
    {
      key: "totalProducts" as const,
      label: "Alternatives indexed",
    },
    {
      key: "totalCreators" as const,
      label: "Shipyard products covered",
    },
    {
      key: "totalUpvotes" as const,
      label: "Categories mapped",
    },
    {
      key: "totalInsights" as const,
      label: "Pairings logged",
    },
  ]

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <DirectoryHeader
            stats={heroStats}
            eyebrow="Alternatives library"
            title="Browse SaaS Alternatives"
            description="Explore vetted third-party tools that founders benchmark against Shipyard launches. Find adjacent options, compare positioning, and map category coverage."
            primaryAction={{
              label: "Submit your product",
              href: MEMBER_PRODUCTS_PATH,
            }}
            secondaryAction={{
              label: "View Shipyard directory",
              href: BROWSE_PATH,
              variant: "outline",
            }}
            metrics={heroMetrics}
          />

          <section className="rounded-3xl border border-border bg-white/95 shadow-sm">
            <div className="border-b border-border/60 px-6 py-6 sm:px-8">
              <div className="mx-auto w-full max-w-3xl">
                <SearchForm defaultValue={query ?? ""} />
              </div>
            </div>
            <div className="px-4 py-8 sm:px-6 lg:px-8">
              <AlternativeCatalogGridClient
                key={query ?? "__all__"}
                initialItems={items}
                initialHasMore={hasMore}
                initialPage={2}
                query={query}
                pageSize={ALTERNATIVE_CATALOG_PAGE_SIZE}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function SearchForm({ defaultValue }: { defaultValue: string }) {
  const inputId = "alternatives-search"
  return (
    <form
      action="/alternatives"
      method="get"
      className="relative w-full max-w-xl"
    >
      <label htmlFor={inputId} className="sr-only">
        Search alternatives
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={inputId}
        name="q"
        type="search"
        placeholder="Search by tool, category, or keyword"
        defaultValue={defaultValue}
        className="h-12 w-full rounded-full border border-border/70 bg-white pl-12 pr-4 text-base shadow-sm transition focus-visible:border-primary focus-visible:ring-primary/40"
        autoComplete="off"
      />
    </form>
  )
}
