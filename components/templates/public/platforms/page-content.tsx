import Link from "next/link"
import { notFound } from "next/navigation"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { EmptyState } from "@/components/molecules/empty-state"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import { getPlatformMeta } from "@/lib/platforms/config"
import {
  getPlatformPagePayload,
  type PlatformPageFilters,
} from "@/lib/platforms/page-cache"
import { buildQuery, type StrOrArr } from "@/lib/urlParams"
import {
  BROWSE_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_PATH,
  platformPath,
} from "@/lib/routes"
import { buildProductListItem } from "@/lib/seo/product-list"
import { cn } from "@/lib/utils"
import { pluralize } from "@/lib/pluralize"

type PlatformSearchParams = {
  sort?: StrOrArr
  verified?: StrOrArr
  page?: StrOrArr
  q?: StrOrArr
}

const resolveSingle = (value: StrOrArr) =>
  Array.isArray(value) ? value[0] : value

const isSort = (value: string | undefined): PlatformPageFilters["sort"] => {
  switch (value) {
    case "trending":
    case "votes":
    case "az":
      return value
    default:
      return "new"
  }
}

const parseSearchParams = (
  params: PlatformSearchParams,
): PlatformPageFilters => {
  const sort = resolveSingle(params.sort)
  const page = Number.parseInt(resolveSingle(params.page) ?? "1", 10)
  const queryRaw = resolveSingle(params.q)

  return {
    sort: isSort(sort),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    verified: resolveSingle(params.verified) === "true",
    query: queryRaw?.trim() ? queryRaw.trim() : undefined,
  }
}

const sortOptions = [
  { value: "new", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "votes", label: "Most Upvoted" },
  { value: "az", label: "A–Z" },
] as const

const buildSearchParams = (params: PlatformSearchParams) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) search.append(key, entry)
      })
    } else if (value) {
      search.set(key, value)
    }
  }
  return search
}

export async function PlatformPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ platform: string }>
  searchParams: Promise<PlatformSearchParams>
}) {
  const { platform } = await params
  const resolvedSearchParams = await searchParams
  const parsed = parseSearchParams(resolvedSearchParams)
  const platformMeta = getPlatformMeta(platform)
  if (!platformMeta) return notFound()

  const payload = await getPlatformPagePayload(platformMeta.slug, parsed)
  if (!payload) return notFound()

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const pagePath = platformPath(platformMeta.slug)
  const resultCount = payload.total

  const searchParamState = buildSearchParams(resolvedSearchParams)
  const buildPath = (overrides: Record<string, string | undefined | null>) =>
    buildQuery(pagePath, searchParamState, {
      ...overrides,
      page: "1",
    })

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${platformMeta.label} products`,
    description: `Browse ${resultCount} ${pluralize(resultCount, "product")} built for ${platformMeta.label}.`,
    itemListOrder:
      parsed.sort === "az"
        ? "https://schema.org/ItemListOrderAscending"
        : "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.products
      .slice(0, 20)
      .map((product, index) =>
        buildProductListItem({
          product,
          position: index + 1,
          siteUrl: baseUrl,
        }),
      ),
  }

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix={`platform-${platformMeta.slug}`}
        webPage={{ path: pagePath, name: `${platformMeta.label} products` }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: platformMeta.label, path: pagePath },
          ],
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <div className="mx-auto max-w-[110rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl">
              {platformMeta.label} products
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              {platformMeta.description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                {payload.total} {pluralize(payload.total, "result")}
              </span>
              <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                {payload.sortLabel}
              </span>
              {parsed.verified ? (
                <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                  Verified only
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {sortOptions.map((option) => (
                <Link
                  key={option.value}
                  href={buildPath({ sort: option.value })}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition",
                    option.value === parsed.sort
                      ? "border-[color:var(--brand-1)] bg-[color:var(--brand-1)] text-white"
                      : "border-border/70 bg-background text-foreground hover:border-border hover:bg-muted/60 dark:border-border/40 dark:bg-slate-950/70",
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
            <Link
              href={buildPath({
                verified: parsed.verified ? null : "true",
              })}
              className="rounded-xl border border-border/70 bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-border hover:bg-muted/60 dark:border-border/40 dark:bg-slate-950/70"
            >
              {parsed.verified ? "Show all launches" : "Verified only"}
            </Link>
            {(parsed.query || parsed.sort !== "new" || parsed.verified) && (
              <Link
                href={pagePath}
                className="ml-auto rounded-xl border border-border/80 bg-background px-4 py-2 text-sm font-semibold text-[color:var(--brand-1)] shadow-sm transition hover:border-border hover:bg-muted/60 dark:border-border/50 dark:bg-slate-950/70"
              >
                Reset filters
              </Link>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {payload.filterSummary.join(" • ")}
              </p>
              <p className="text-xs text-muted-foreground">
                Want to feature your launch?{" "}
                <Link
                  className="font-semibold text-[color:var(--brand-1)] underline-offset-4 hover:underline"
                  href={MEMBER_PRODUCTS_PATH}
                >
                  Submit your product
                </Link>
              </p>
            </div>

            {payload.products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center">
                <EmptyState
                  title={`No ${platformMeta.label} launches yet`}
                  description="Check back soon or explore everything in browse."
                  actionLabel="Visit browse"
                  actionHref={BROWSE_PATH}
                />
              </div>
            ) : (
              <ProductGridClient
                initialProducts={payload.products}
                initialHasMore={payload.hasMore}
                initialPage={parsed.page + 1}
                searchParams={{
                  platform: platformMeta.slug,
                  sort: parsed.sort,
                  verified: parsed.verified,
                  q: parsed.query,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
