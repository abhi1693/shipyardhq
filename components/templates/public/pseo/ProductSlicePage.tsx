import Link from "next/link"

import ProductGridClient from "@/components/molecules/ProductGridClient"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { AnswerBlocks } from "@/components/templates/public/common/AnswerBlocks"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { buildProductListItem } from "@/lib/seo/product-list"
import { formatTagLabel } from "@/app/(public)/tags/_utils"
import { keywordToSlug } from "@/lib/tags"
import {
  alternativeCategoryPath,
  alternativePath,
  categoryPath,
  categoryPlatformPath,
  categoryPricingPath,
  categoryProductTypePath,
  pricingModelPath,
  productPath,
  productTypePath,
  tagPath,
  usecaseCategoryPath,
  usecasePlatformPath,
  usecasePricingPath,
} from "@/lib/routes"
import { getPlatformMetaByValue } from "@/lib/platforms/config"
import { pricingModelSlugFromValue } from "@/lib/pricing/models"
import { productTypeSlugFromValue } from "@/lib/product-types/models"
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

type RelatedLink = {
  label: string
  href: string
  description?: string
}

type LinkGroup = {
  title: string
  links: RelatedLink[]
}

type ProductSlicePageProps = {
  title: string
  description: string
  intro?: string
  pagePath: string
  scriptKeyPrefix: string
  breadcrumbs: BreadcrumbItem[]
  relatedLinks?: RelatedLink[]
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

function productCategoryName(product: ProductCardBase) {
  return typeof product.category === "string"
    ? product.category
    : (product.category?.name ?? null)
}

function productReason(product: ProductCardBase, fallbackContext: string) {
  const reasons = [
    product.tagline?.trim(),
    productCategoryName(product)
      ? `listed in ${productCategoryName(product)}`
      : null,
    product.isVerified ? "verified maker profile" : null,
    product.sponsored ? "promoted launch placement" : null,
    typeof product.analytics?.upvotes === "number" &&
    product.analytics.upvotes > 0
      ? `${product.analytics.upvotes} ${pluralize(product.analytics.upvotes, "upvote")}`
      : null,
  ].filter((item): item is string => Boolean(item))

  return reasons.length
    ? reasons.slice(0, 3).join("; ")
    : `matches the ${fallbackContext} filter on Shipyard.`
}

function buildIntroCopy({
  title,
  description,
  total,
  chips,
}: {
  title: string
  description: string
  total: number
  chips: string[]
}) {
  const filters = chips.length
    ? ` The active filters are ${chips.join(", ")}.`
    : ""
  return `${description} Shipyard uses published product metadata, launch recency, maker signals, and directory relationships to keep this ${title.toLowerCase()} view useful for comparison.${filters} There ${total === 1 ? "is" : "are"} ${total} ${pluralize(total, "product")} in this slice.`
}

function buildRelatedLinks({
  breadcrumbs,
  relatedLinks,
}: {
  breadcrumbs: BreadcrumbItem[]
  relatedLinks?: RelatedLink[]
}) {
  const explicitLinks = relatedLinks ?? []
  const breadcrumbLinks = breadcrumbs.slice(1, -1).map((item) => ({
    label: item.name,
    href: item.path,
    description: `Browse the parent ${item.name.toLowerCase()} directory.`,
  }))

  const seen = new Set<string>()
  return [...explicitLinks, ...breadcrumbLinks].filter((link) => {
    if (!link.href || seen.has(link.href)) return false
    seen.add(link.href)
    return true
  })
}

function uniqueLinks(links: RelatedLink[], limit = 8) {
  const seen = new Set<string>()
  return links
    .filter((link) => {
      if (!link.href || seen.has(link.href)) return false
      seen.add(link.href)
      return true
    })
    .slice(0, limit)
}

function buildProductAlternativeLinks(products: ProductCardBase[]) {
  return uniqueLinks(
    products.flatMap((product) =>
      (product.alternatives ?? []).map((alternative) => ({
        label: `${alternative.name} alternatives`,
        href: alternativePath(alternative.slug),
        description: `Compare products positioned around ${alternative.name}.`,
      })),
    ),
    6,
  )
}

function buildProductTagLinks(products: ProductCardBase[]) {
  return uniqueLinks(
    products.flatMap((product) =>
      (product.keywords ?? [])
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .map((keyword) => {
          const slug = keywordToSlug(keyword)
          return {
            label: formatTagLabel(keyword) || keyword,
            href: tagPath(slug),
            description: `Browse products tagged with ${formatTagLabel(keyword) || keyword}.`,
          }
        }),
    ),
    8,
  )
}

function buildAdjacentFilterLinks({
  products,
  searchParams,
}: {
  products: ProductCardBase[]
  searchParams: ProductSlicePageProps["searchParams"]
}) {
  const links: RelatedLink[] = []

  for (const product of products.slice(0, 8)) {
    const categorySlug = product.category?.slug ?? searchParams.category
    const productTypeSlug = product.type
      ? productTypeSlugFromValue(
          product.type as Parameters<typeof productTypeSlugFromValue>[0],
        )
      : undefined
    const pricingSlug = product.pricingModel
      ? pricingModelSlugFromValue(product.pricingModel)
      : undefined

    if (categorySlug) {
      if (!searchParams.category && product.category?.name) {
        links.push({
          label: product.category.name,
          href: categoryPath(categorySlug),
          description: `Browse the ${product.category.name} category.`,
        })
      }

      if (pricingSlug && !searchParams.pricingModel) {
        links.push({
          label: `${product.category?.name ?? "Category"} with ${pricingSlug.replace(/-/g, " ")} pricing`,
          href: categoryPricingPath(categorySlug, pricingSlug),
          description: "Narrow this category by pricing model.",
        })
      }

      if (productTypeSlug && !searchParams.productType) {
        links.push({
          label: `${product.category?.name ?? "Category"} ${productTypeSlug.replace(/-/g, " ")}`,
          href: categoryProductTypePath(categorySlug, productTypeSlug),
          description: "Narrow this category by product type.",
        })
      }

      for (const platform of product.platforms ?? []) {
        const platformMeta = getPlatformMetaByValue(platform)
        if (!platformMeta || searchParams.platform) continue
        links.push({
          label: `${product.category?.name ?? "Category"} for ${platformMeta.label}`,
          href: categoryPlatformPath(categorySlug, platformMeta.slug),
          description: "Narrow this category by supported platform.",
        })
      }
    }

    if (searchParams.useCase) {
      if (categorySlug && !searchParams.category) {
        links.push({
          label: "Use case by category",
          href: usecaseCategoryPath(searchParams.useCase, categorySlug),
          description: "Narrow this use case by product category.",
        })
      }
      if (pricingSlug && !searchParams.pricingModel) {
        links.push({
          label: "Use case by pricing",
          href: usecasePricingPath(searchParams.useCase, pricingSlug),
          description: "Narrow this use case by pricing model.",
        })
      }
      for (const platform of product.platforms ?? []) {
        const platformMeta = getPlatformMetaByValue(platform)
        if (!platformMeta || searchParams.platform) continue
        links.push({
          label: `Use case for ${platformMeta.label}`,
          href: usecasePlatformPath(searchParams.useCase, platformMeta.slug),
          description: "Narrow this use case by supported platform.",
        })
      }
    }

    if (searchParams.alternative && categorySlug && !searchParams.category) {
      links.push({
        label: "Alternative by category",
        href: alternativeCategoryPath(searchParams.alternative, categorySlug),
        description: "Narrow this alternatives directory by category.",
      })
    }

    if (pricingSlug && !searchParams.category && !searchParams.useCase) {
      links.push({
        label: `${pricingSlug.replace(/-/g, " ")} pricing`,
        href: pricingModelPath(pricingSlug),
        description: "Browse this pricing model across Shipyard.",
      })
    }

    if (productTypeSlug && !searchParams.category && !searchParams.useCase) {
      links.push({
        label: `${productTypeSlug.replace(/-/g, " ")} products`,
        href: productTypePath(productTypeSlug),
        description: "Browse this product type across Shipyard.",
      })
    }
  }

  return uniqueLinks(links, 8)
}

function buildLinkGroups({
  products,
  searchParams,
}: {
  products: ProductCardBase[]
  searchParams: ProductSlicePageProps["searchParams"]
}): LinkGroup[] {
  return [
    {
      title: "Alternative directories",
      links: buildProductAlternativeLinks(products),
    },
    {
      title: "Tags from these products",
      links: buildProductTagLinks(products),
    },
    {
      title: "Adjacent filters",
      links: buildAdjacentFilterLinks({ products, searchParams }),
    },
  ].filter((group) => group.links.length)
}

export function ProductSlicePage({
  title,
  description,
  intro,
  pagePath,
  scriptKeyPrefix,
  breadcrumbs,
  relatedLinks,
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
    "@id": `${baseUrl}${pagePath}#itemlist`,
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
  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}${pagePath}#collection`,
    url: `${baseUrl}${pagePath}`,
    name: title,
    description,
    mainEntity: {
      "@id": `${baseUrl}${pagePath}#itemlist`,
    },
  }

  const faq = buildDirectoryFaq({
    title,
    count: total,
    qualifier: faqQualifier,
    pageUrl: pagePath,
  })
  const visibleFaq = faq.mainEntity.map((entry) => ({
    question: entry.name,
    answer: entry.acceptedAnswer.text,
  }))
  const topProducts = products.slice(0, 5)
  const linkGroups = buildLinkGroups({ products, searchParams })
  const uniqueIntro =
    intro ??
    buildIntroCopy({
      title,
      description,
      total,
      chips,
    })
  const directoryLinks = buildRelatedLinks({ breadcrumbs, relatedLinks })

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      <div className="mx-auto max-w-[110rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-muted-foreground"
          >
            <ol className="flex flex-wrap items-center justify-center gap-2">
              {breadcrumbs.map((item, index) => {
                const isCurrent = index === breadcrumbs.length - 1
                return (
                  <li
                    key={`${item.path}-${index}`}
                    className="flex items-center gap-2"
                  >
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    {isCurrent ? (
                      <span className="font-semibold text-foreground">
                        {item.name}
                      </span>
                    ) : (
                      <Link
                        href={item.path}
                        className="underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {item.name}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>

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

          <section className="rounded-xl border border-border/70 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1C2333]">
              How to use this directory
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {uniqueIntro}
            </p>
          </section>

          {topProducts.length ? (
            <section className="rounded-xl border border-border/70 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1C2333]">
                Top products in this slice
              </h2>
              <div className="mt-4 grid gap-3">
                {topProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className="rounded-lg border border-border/70 bg-[#f8fafc] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link
                        href={productPath(product.slug)}
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {index + 1}. {product.name}
                      </Link>
                      {product.isVerified ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Reason to consider: {productReason(product, faqQualifier)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {directoryLinks.length ? (
            <section className="rounded-xl border border-border/70 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1C2333]">
                Related directories
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {directoryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg border border-border/70 bg-[#f8fafc] p-4 transition hover:border-foreground/20"
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {link.label}
                    </span>
                    {link.description ? (
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {link.description}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {linkGroups.length ? (
            <section className="rounded-xl border border-border/70 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#1C2333]">
                More ways to explore this slice
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {linkGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {group.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          title={link.description}
                          className="rounded-full border border-border/70 bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-foreground transition hover:border-foreground/20 hover:bg-white"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <AnswerBlocks
            blocks={[
              {
                title: "What this page lists",
                body: `${title} lists ${total} ${pluralize(total, "product")} matching this Shipyard directory slice. The results reflect the selected filters, sort order, and available public product metadata.`,
              },
              {
                title: "Who it is for",
                body: `This page is for founders, buyers, operators, and researchers comparing ${faqQualifier} by category, use case, pricing model, platform, verification, badges, or alternatives.`,
              },
              {
                title: "How rankings work",
                body: "Default ordering favors recent eligible launches, while trending and vote-based sorting use public Shipyard discovery signals. Sponsored or priority placements may receive eligible visibility treatment.",
              },
              {
                title: "Freshness policy",
                body: "This directory slice revalidates frequently and updates when products launch, change metadata, receive badges, become verified, or match new filter relationships.",
              },
            ]}
          />

          <section className="rounded-xl border border-border/70 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1C2333]">
              Frequently asked questions
            </h2>
            <div className="mt-4 divide-y divide-border/70">
              {visibleFaq.map((entry) => (
                <article key={entry.question} className="py-4 first:pt-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {entry.question}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {entry.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>

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
