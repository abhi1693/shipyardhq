export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  getBrowseProductsApiV1PublicBrowseProductsGet,
  getCategoryDetailApiV1PublicCategoriesSlugDetailGet,
} from "@/lib/generated/fastapi/public-homepage"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  categoryPath,
  categoryPlatformPath,
  productPath,
} from "@/lib/routes"
import { buildQuery, type StrOrArr } from "@/lib/urlParams"
import { getPlatformMeta } from "@/lib/platforms/config"
import { pluralize } from "@/lib/pluralize"
import { cn } from "@/lib/utils"

type CategoryPlatformParams = {
  slug: string
  platform: string
}

type CategoryPlatformSearchParams = {
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
  params: CategoryPlatformSearchParams,
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

const buildSearchParams = (params: CategoryPlatformSearchParams) => {
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

export async function generateMetadata(props: {
  params: Promise<CategoryPlatformParams>
}) {
  const { slug, platform } = await props.params
  const platformMeta = getPlatformMeta(platform)
  if (!platformMeta) return {}

  let categoryName = ""
  let categoryDescription = ""
  try {
    const response = await getCategoryDetailApiV1PublicCategoriesSlugDetailGet(
      slug,
      { pageSize: 1 },
    )
    if (response.status !== 200) {
      return {}
    }
    categoryName = response.data.category.name
    categoryDescription = response.data.category.description ?? ""
  } catch {
    return {}
  }

  const title = `${categoryName} tools for ${platformMeta.label}`
  const description = categoryDescription
    ? `${categoryDescription} Browse ${categoryName.toLowerCase()} products built for ${platformMeta.label}.`
    : `Discover ${categoryName.toLowerCase()} software made for ${platformMeta.label} users.`

  const metadata = buildPageMetadata({
    title,
    description,
    section: "Categories",
    openGraph: { title, description },
    twitter: { title, description },
  })

  return {
    ...metadata,
    keywords: [
      `${categoryName.toLowerCase()} tools for ${platformMeta.label.toLowerCase()}`,
      `${categoryName.toLowerCase()} ${platformMeta.label.toLowerCase()} apps`,
      `${platformMeta.label.toLowerCase()} ${categoryName.toLowerCase()} software`,
    ],
  }
}

export default async function CategoryPlatformPage({
  params,
  searchParams,
}: {
  params: Promise<CategoryPlatformParams>
  searchParams: Promise<CategoryPlatformSearchParams>
}) {
  const { slug, platform } = await params
  const platformMeta = getPlatformMeta(platform)
  if (!platformMeta) return notFound()

  let categoryResponse: Awaited<
    ReturnType<typeof getCategoryDetailApiV1PublicCategoriesSlugDetailGet>
  >
  try {
    categoryResponse =
      await getCategoryDetailApiV1PublicCategoriesSlugDetailGet(slug, {
        pageSize: 1,
      })
  } catch {
    return notFound()
  }
  if (categoryResponse.status !== 200) {
    return notFound()
  }
  const category = categoryResponse.data.category
  if (!category) return notFound()

  const resolvedSearchParams = await searchParams
  const parsed = parseSearchParams(resolvedSearchParams)

  const browseResponse = await getBrowseProductsApiV1PublicBrowseProductsGet({
    category: slug,
    platform: platformMeta.slug,
    sort: parsed.sort,
    verified: parsed.verified,
    page: parsed.page,
    q: parsed.query,
  })
  if (browseResponse.status !== 200) {
    return notFound()
  }
  const payload = browseResponse.data

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const pagePath = categoryPlatformPath(slug, platformMeta.slug)

  const searchParamState = buildSearchParams(resolvedSearchParams)
  const buildPath = (overrides: Record<string, string | undefined | null>) =>
    buildQuery(pagePath, searchParamState, {
      ...overrides,
      page: "1",
    })

  const toAbsoluteUrl = (value?: string | null) => {
    if (!value) return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (trimmed.startsWith("/")) return `${baseUrl}${trimmed}`
    return `${baseUrl}/${trimmed}`
  }

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} products for ${platformMeta.label}`,
    description: `Browse ${payload.total ?? payload.items.length} ${pluralize(payload.total ?? payload.items.length, "product")} in ${category.name} built for ${platformMeta.label}.`,
    itemListOrder:
      parsed.sort === "az"
        ? "https://schema.org/ItemListOrderAscending"
        : "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.items.slice(0, 20).map((product, index) => {
      const productUrl = `${baseUrl}${productPath(product.slug)}`
      return {
        "@type": "ListItem",
        position: index + 1,
        url: productUrl,
        item: {
          "@type": "Product",
          name: product.name,
          description: product.tagline,
          image: toAbsoluteUrl(product.logo),
          url: productUrl,
          category: category.name,
        },
      }
    }),
  }

  const resultCount =
    typeof payload.total === "number" && Number.isFinite(payload.total)
      ? payload.total
      : payload.items.length

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix={`category-${slug}-platform-${platformMeta.slug}`}
        webPage={{
          path: pagePath,
          name: `${category.name} products for ${platformMeta.label}`,
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

      <div className="mx-auto max-w-[110rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[#1C2333] sm:text-5xl">
              {category.name} products for {platformMeta.label}
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Browse {resultCount} {pluralize(resultCount, "product")} in{" "}
              {category.name.toLowerCase()} built for {platformMeta.label}.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                {resultCount} {pluralize(resultCount, "result")}
              </span>
              <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                Platform: {platformMeta.label}
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
            initialProducts={payload.items}
            initialHasMore={payload.hasMore}
            initialPage={parsed.page}
            searchParams={{
              category: slug,
              platform: platformMeta.slug,
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
