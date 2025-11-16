export const dynamic = "force-static"
export const revalidate = 600

import Link from "next/link"
import { notFound } from "next/navigation"

import { getCategoriesWithCounts, getCategoryMeta } from "@/actions/public/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { buildPageMetadata } from "@/lib/metadata"
import {
  HOME_PATH,
  CATEGORIES_PATH,
  categoryPath,
  categoryPlatformPath,
  productPath,
} from "@/lib/routes"
import { buildQuery, type StrOrArr } from "@/lib/urlParams"
import { getPlatformMeta, PLATFORM_SLUGS } from "@/lib/platforms/config"
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

const isSort = (value: string | undefined): "new" | "trending" | "votes" | "az" =>
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

export async function generateStaticParams() {
  const categories = await getCategoriesWithCounts()
  return categories
    .filter((category) => category.slug && category.count > 0)
    .flatMap((category) =>
      PLATFORM_SLUGS.map((platform) => ({
        slug: category.slug,
        platform,
      })),
    )
}

export async function generateMetadata(props: {
  params: Promise<CategoryPlatformParams>
}) {
  const { slug, platform } = await props.params
  const category = await getCategoryMeta(slug)
  const platformMeta = getPlatformMeta(platform)
  if (!category || !platformMeta) return {}

  const title = `${category.name} tools for ${platformMeta.label}`
  const description = category.description
    ? `${category.description} Browse ${category.name.toLowerCase()} products built for ${platformMeta.label}.`
    : `Discover ${category.name.toLowerCase()} software made for ${platformMeta.label} users.`

  const pagePath = categoryPlatformPath(slug, platformMeta.slug)

  return {
    ...buildPageMetadata({
      title,
      description,
      section: "Categories",
      openGraph: { title, description },
      twitter: { title, description },
      alternates: { canonical: pagePath },
      keywords: [
        `${category.name.toLowerCase()} tools for ${platformMeta.label.toLowerCase()}`,
        `${category.name.toLowerCase()} ${platformMeta.label.toLowerCase()} apps`,
        `${platformMeta.label.toLowerCase()} ${category.name.toLowerCase()} software`,
      ],
    }),
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
  const category = await getCategoryMeta(slug)
  const platformMeta = getPlatformMeta(platform)
  if (!category || !platformMeta) return notFound()

  const resolvedSearchParams = await searchParams
  const parsed = parseSearchParams(resolvedSearchParams)

  const payload = await getBrowseProducts({
    categorySlug: slug,
    platform: platformMeta.value,
    sort: parsed.sort,
    verified: parsed.verified,
    page: parsed.page,
    query: parsed.query,
  })

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev").replace(
    /\/$/,
    "",
  )
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
    description: `Browse ${payload.total ?? payload.products.length} ${pluralize(payload.total ?? payload.products.length, "product")} in ${category.name} built for ${platformMeta.label}.`,
    itemListOrder:
      parsed.sort === "az"
        ? "https://schema.org/ItemListOrderAscending"
        : "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.products.slice(0, 20).map((product, index) => {
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
      : payload.products.length

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
            initialProducts={payload.products}
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
