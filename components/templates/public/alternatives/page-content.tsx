import {
  ALTERNATIVE_CATALOG_PAGE_SIZE,
  getAlternativeCatalogPage,
} from "@/actions/public/alternatives/actions"
import Link from "next/link"

import { AlternativeCatalogGridClient } from "@/components/molecules/AlternativeCatalogGridClient"
import {
  BROWSE_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"
import { brandGradient, gradientTint } from "@/lib/ui/tints"
import {
  launchPrimaryButton,
  launchSecondaryButton,
} from "@/lib/ui/buttons"

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

  const { items, hasMore } = await getAlternativeCatalogPage({
    page: 1,
    pageSize: ALTERNATIVE_CATALOG_PAGE_SIZE,
    query,
  })

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <section
            className={brandGradient(
              "relative overflow-hidden rounded-3xl border border-border px-6 py-16 shadow-sm md:px-12",
            )}
          >
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center gap-6">
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Browse SaaS Alternatives
                </h1>
                <p className="text-base text-white/85 sm:text-lg">
                  Explore vetted third-party tools founders benchmark against Shipyard launches. Find adjacent options, compare positioning, and map category coverage in one curated place.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={MEMBER_PRODUCTS_PATH}
                  className={launchPrimaryButton({ size: "lg" })}
                >
                  Submit your product
                </Link>
                <Link
                  href={BROWSE_PATH}
                  className={launchSecondaryButton({ size: "lg" })}
                >
                  View Shipyard directory
                </Link>
              </div>
            </div>
          </section>

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
