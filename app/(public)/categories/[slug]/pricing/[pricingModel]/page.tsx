import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { getCategoryMeta } from "@/actions/public/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  categoryPath,
  categoryPricingPath,
} from "@/lib/routes"
import { buildQuery, type StrOrArr } from "@/lib/urlParams"
import { getCategoryStaticParams } from "@/lib/categories/page-cache"
import { getPricingModelMeta, PRICING_MODEL_SLUGS } from "@/lib/pricing/models"
import { buildProductListItem } from "@/lib/seo/product-list"
import { pluralize } from "@/lib/pluralize"
import { cn } from "@/lib/utils"
import {
  buildDirectoryFaq,
  pseoRobotsForTotal,
} from "@/lib/pseo/product-slices"

type CategoryPricingParams = {
  slug: string
  pricingModel: string
}

type CategoryPricingSearchParams = {
  sort?: StrOrArr
  verified?: StrOrArr
  page?: StrOrArr
  q?: StrOrArr
}

const sortOptions = [
  { value: "new", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "votes", label: "Most Upvoted" },
  { value: "az", label: "A–Z" },
] as const

const resolveSingle = (value: StrOrArr) =>
  Array.isArray(value) ? value[0] : value

const isSort = (
  value: string | undefined,
): "new" | "trending" | "votes" | "az" =>
  value === "trending" || value === "votes" || value === "az" ? value : "new"

const parseSearchParams = (
  params: CategoryPricingSearchParams,
): {
  sort: "new" | "trending" | "votes" | "az"
  page: number
  verified: boolean
  query?: string
} => {
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

const buildSearchParams = (params: CategoryPricingSearchParams) => {
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

export async function generateStaticParams() {
  const categories = await getCategoryStaticParams()

  return categories.flatMap((category) =>
    PRICING_MODEL_SLUGS.map((pricingModel) => ({
      slug: category.slug,
      pricingModel,
    })),
  )
}

export async function generateMetadata(props: {
  params: Promise<CategoryPricingParams>
}): Promise<ReturnType<typeof buildPageMetadata>> {
  const { slug, pricingModel } = await props.params
  const category = await getCategoryMeta(slug)
  const pricingModelMeta = getPricingModelMeta(pricingModel)
  if (!category || !pricingModelMeta) return {}

  const total = await getBrowseProducts({
    categorySlug: slug,
    pricingModel: pricingModelMeta.value,
    pageSize: 1,
  }).then((payload) => payload.total ?? payload.products.length)
  const title = `${pricingModelMeta.label} ${category.name} tools`
  const description = category.description
    ? `${category.description} Browse ${total} ${pricingModelMeta.label.toLowerCase()} ${category.name.toLowerCase()} products curated on Shipyard.`
    : `Discover ${total} ${pricingModelMeta.label.toLowerCase()} ${category.name.toLowerCase()} software products from indie makers.`

  const metadata = buildPageMetadata({
    title,
    description,
    section: "Categories",
    canonical: categoryPricingPath(slug, pricingModelMeta.slug),
    openGraph: { title, description },
    twitter: { title, description },
  })

  return {
    ...metadata,
    robots: pseoRobotsForTotal(total),
    keywords: [
      `${pricingModelMeta.label.toLowerCase()} ${category.name.toLowerCase()} tools`,
      `${pricingModelMeta.label.toLowerCase()} ${category.name.toLowerCase()} software`,
      `${category.name.toLowerCase()} products with ${pricingModelMeta.label.toLowerCase()} pricing`,
    ],
  }
}

export default function CategoryPricingPage(props: {
  params: Promise<CategoryPricingParams>
  searchParams: Promise<CategoryPricingSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <CategoryPricingPageContent {...props} />
    </Suspense>
  )
}

async function CategoryPricingPageContent({
  params,
  searchParams,
}: {
  params: Promise<CategoryPricingParams>
  searchParams: Promise<CategoryPricingSearchParams>
}) {
  const { slug, pricingModel } = await params
  const pricingModelMeta = getPricingModelMeta(pricingModel)
  if (!pricingModelMeta) return notFound()

  const category = await getCategoryMeta(slug)
  if (!category) return notFound()

  const resolvedSearchParams = await searchParams
  const parsed = parseSearchParams(resolvedSearchParams)

  const payload = await getBrowseProducts({
    categorySlug: slug,
    pricingModel: pricingModelMeta.value,
    sort: parsed.sort,
    verified: parsed.verified,
    page: parsed.page,
    query: parsed.query,
  })

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const pagePath = categoryPricingPath(slug, pricingModelMeta.slug)

  const searchParamState = buildSearchParams(resolvedSearchParams)
  const buildPath = (overrides: Record<string, string | undefined | null>) =>
    buildQuery(pagePath, searchParamState, {
      ...overrides,
      page: "1",
    })

  const resultCount =
    typeof payload.total === "number" && Number.isFinite(payload.total)
      ? payload.total
      : payload.products.length

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${pricingModelMeta.label} ${category.name} products`,
    description: `Browse ${payload.total ?? payload.products.length} ${pluralize(payload.total ?? payload.products.length, "product")} with ${pricingModelMeta.label.toLowerCase()} pricing in the ${category.name} category.`,
    itemListOrder:
      parsed.sort === "az"
        ? "https://schema.org/ItemListOrderAscending"
        : "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.products.slice(0, 20).map((product, index) =>
      buildProductListItem({
        product,
        position: index + 1,
        siteUrl: baseUrl,
        categoryName: category.name,
      }),
    ),
  }
  const faq = buildDirectoryFaq({
    title: `${pricingModelMeta.label} ${category.name} products`,
    count: resultCount,
    qualifier: `${pricingModelMeta.label.toLowerCase()} ${category.name.toLowerCase()} tools`,
    pageUrl: pagePath,
  })

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix={`category-${slug}-pricing-${pricingModelMeta.slug}`}
        webPage={{
          path: pagePath,
          name: `${pricingModelMeta.label} ${category.name} tools`,
        }}
        breadcrumbs={{
          items: [
            { name: "Home", path: HOME_PATH },
            { name: "Categories", path: CATEGORIES_PATH },
            { name: category.name, path: categoryPath(slug) },
          ],
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      <div className="mx-auto max-w-[110rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl">
              {pricingModelMeta.label} {category.name} products
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Browse {resultCount} {pluralize(resultCount, "product")} in{" "}
              {category.name.toLowerCase()} with{" "}
              {pricingModelMeta.label.toLowerCase()} pricing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                {resultCount} {pluralize(resultCount, "result")}
              </span>
              <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                {pricingModelMeta.label} pricing
              </span>
              {parsed.verified ? (
                <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                  Verified makers only
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
            <div className="ms-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {parsed.verified ? (
                <Link
                  href={buildPath({ verified: null })}
                  className="rounded-full border border-border px-3 py-1 font-semibold text-foreground"
                >
                  Show all makers
                </Link>
              ) : (
                <Link
                  href={buildPath({ verified: "true" })}
                  className="rounded-full border border-border px-3 py-1 font-semibold text-foreground"
                >
                  Verified only
                </Link>
              )}
            </div>
          </div>

          <ProductGridClient
            initialProducts={payload.products}
            initialHasMore={payload.hasMore}
            initialPage={parsed.page}
            searchParams={{
              category: slug,
              pricingModel: pricingModelMeta.slug,
              sort: parsed.sort,
              verified: parsed.verified,
              q: parsed.query,
            }}
          />
        </div>
      </div>
    </main>
  )
}
