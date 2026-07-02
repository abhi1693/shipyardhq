import Link from "next/link"

import ProductGridClient from "@/components/molecules/ProductGridClient"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { buildProductListItem } from "@/lib/seo/product-list"
import { buildQuery } from "@/lib/urlParams"
import { pluralize } from "@/lib/pluralize"
import { cn } from "@/lib/utils"
import {
  buildPseoSearchParams,
  buildDirectoryFaq,
  PSEO_PRODUCT_SLICE_PAGE_SIZE,
  pseoSortOptions,
  type ParsedPseoSearchParams,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type BreadcrumbItem = {
  name: string
  path: string
}

type ProductSlicePageProps = {
  title: string
  description: string
  pagePath: string
  scriptKeyPrefix: string
  breadcrumbs: BreadcrumbItem[]
  products: ProductCardBase[]
  total: number
  hasMore: boolean
  parsed: ParsedPseoSearchParams
  rawSearchParams: PseoSearchParams
  searchParams: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
    q?: string
    platform?: string
    pricingModel?: string
    productType?: string
    badge?: string
    alternative?: string
  }
  chips: string[]
  itemListName: string
  itemListDescription: string
  faqQualifier: string
}

export function ProductSlicePage({
  title,
  description,
  pagePath,
  scriptKeyPrefix,
  breadcrumbs,
  products,
  total,
  hasMore,
  parsed,
  rawSearchParams,
  searchParams,
  chips,
  itemListName,
  itemListDescription,
  faqQualifier,
}: ProductSlicePageProps) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const searchParamState = buildPseoSearchParams(rawSearchParams)
  const buildPath = (overrides: Record<string, string | undefined | null>) =>
    buildQuery(pagePath, searchParamState, {
      ...overrides,
      page: "1",
    })

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: itemListName,
    description: itemListDescription,
    itemListOrder:
      parsed.sort === "az"
        ? "https://schema.org/ItemListOrderAscending"
        : "https://schema.org/ItemListOrderDescending",
    numberOfItems: total,
    itemListElement: products.slice(0, 20).map((product, index) =>
      buildProductListItem({
        product,
        position: index + 1,
        siteUrl: baseUrl,
      }),
    ),
  }

  const faq = buildDirectoryFaq({
    title,
    count: total,
    qualifier: faqQualifier,
    pageUrl: pagePath,
  })

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix={scriptKeyPrefix}
        webPage={{ path: pagePath, name: title }}
        breadcrumbs={{ items: breadcrumbs }}
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
              {title}
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              {description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                {total} {pluralize(total, "result")}
              </span>
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm"
                >
                  {chip}
                </span>
              ))}
              {parsed.verified ? (
                <span className="rounded-full border border-border/70 bg-white px-3 py-1 font-semibold text-foreground shadow-sm">
                  Verified makers only
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {pseoSortOptions.map((option) => (
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
            initialProducts={products}
            initialHasMore={hasMore}
            initialPage={parsed.page + 1}
            pageSize={PSEO_PRODUCT_SLICE_PAGE_SIZE}
            searchParams={{
              ...searchParams,
              sort: parsed.sort,
              verified: searchParams.verified || parsed.verified,
              q: parsed.query,
            }}
          />
        </div>
      </div>
    </main>
  )
}
