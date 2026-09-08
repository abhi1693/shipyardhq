import Link from "next/link"
import { Compass } from "lucide-react"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { DirectoryFilterControls } from "@/components/molecules/DirectoryFilterControls"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { TaxonomyProductGridFeed } from "@/components/templates/public/common/TaxonomyProductGridFeed"
import { resolveTaxonomyReferenceDateIso } from "@/components/templates/public/common/TaxonomyProductRows"
import { buildProductListItem } from "@/lib/seo/product-list"
import { formatTagLabel } from "@/app/(public)/tags/_utils"
import { keywordToSlug } from "@/lib/tags"
import {
  alternativeCategoryPath,
  alternativePath,
  BROWSE_PATH,
  categoryPath,
  categoryPlatformPath,
  categoryPricingPath,
  categoryProductTypePath,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  pricingModelPath,
  productTypePath,
  tagPath,
  usecaseCategoryPath,
  usecasePlatformPath,
  usecasePricingPath,
} from "@/lib/routes"
import { getPlatformMetaByValue } from "@/lib/platforms/config"
import { pricingModelSlugFromValue } from "@/lib/pricing/models"
import { resolveProductCategories } from "@/lib/products/categories"
import { productTypeSlugFromValue } from "@/lib/product-types/models"
import { buildQuery } from "@/lib/urlParams"
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
    const productCategories = resolveProductCategories(
      product.category,
      product.categories,
    )
    const activeCategory = searchParams.category
      ? (productCategories.find(
          (category) => category.slug === searchParams.category,
        ) ?? {
          name: product.category?.name ?? "Category",
          slug: searchParams.category,
        })
      : productCategories[0]
    const categorySlug = activeCategory?.slug
    const categoryName = activeCategory?.name ?? "Category"
    const productTypeSlug = product.type
      ? productTypeSlugFromValue(
          product.type as Parameters<typeof productTypeSlugFromValue>[0],
        )
      : undefined
    const pricingSlug = product.pricingModel
      ? pricingModelSlugFromValue(product.pricingModel)
      : undefined

    if (categorySlug) {
      if (!searchParams.category) {
        for (const category of productCategories) {
          if (!category.slug) continue
          links.push({
            label: category.name,
            href: categoryPath(category.slug),
            description: `Browse the ${category.name} category.`,
          })
        }
      }

      if (pricingSlug && !searchParams.pricingModel) {
        links.push({
          label: `${categoryName} with ${pricingSlug.replace(/-/g, " ")} pricing`,
          href: categoryPricingPath(categorySlug, pricingSlug),
          description: "Narrow this category by pricing model.",
        })
      }

      if (productTypeSlug && !searchParams.productType) {
        links.push({
          label: `${categoryName} ${productTypeSlug.replace(/-/g, " ")}`,
          href: categoryProductTypePath(categorySlug, productTypeSlug),
          description: "Narrow this category by product type.",
        })
      }

      for (const platform of product.platforms ?? []) {
        const platformMeta = getPlatformMetaByValue(platform)
        if (!platformMeta || searchParams.platform) continue
        links.push({
          label: `${categoryName} for ${platformMeta.label}`,
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
  const linkGroups = buildLinkGroups({ products, searchParams })
  const directoryLinks = buildRelatedLinks({ breadcrumbs, relatedLinks })
  const verifiedCount = products.filter((product) => product.isVerified).length
  const referenceDateIso = resolveTaxonomyReferenceDateIso(products)
  const browseParams = new URLSearchParams()
  if (searchParams.useCase) browseParams.set("useCase", searchParams.useCase)
  if (searchParams.category) browseParams.set("category", searchParams.category)
  if (searchParams.platform) browseParams.set("platform", searchParams.platform)
  if (searchParams.pricingModel) {
    browseParams.set("pricingModel", searchParams.pricingModel)
  }
  const browseHref = browseParams.toString()
    ? `${BROWSE_PATH}?${browseParams.toString()}`
    : BROWSE_PATH
  const filterControls = (
    <DirectoryFilterControls
      options={pseoSortOptions.map((option) => ({
        ...option,
        href: buildPath({ sort: option.value }),
        active: option.value === parsed.sort,
      }))}
      secondary={
        parsed.verified
          ? {
              href: buildPath({ verified: null }),
              label: "Show all makers",
            }
          : {
              href: buildPath({ verified: "true" }),
              label: "Verified only",
            }
      }
    />
  )
  const feed = (
    <div className="space-y-6">
      {filterControls}
      <TaxonomyProductGridFeed
        products={products}
        hasMore={hasMore}
        initialPage={parsed.page + 1}
        pageSize={PSEO_PRODUCT_SLICE_PAGE_SIZE}
        referenceDateIso={referenceDateIso}
        searchParams={{
          ...searchParams,
          sort: parsed.sort,
          verified: searchParams.verified || parsed.verified,
          q: parsed.query,
        }}
        emptyTitle={`No ${title.toLowerCase()} yet`}
      />
    </div>
  )
  const structuredData = (
    <>
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
    </>
  )
  const afterFeed = (
    <div className="space-y-8">
      {directoryLinks.length ? (
        <section>
          <h2 className="text-lg font-semibold text-black">
            Related directories
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {directoryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="block text-sm font-semibold text-black">
                  {link.label}
                </span>
                {link.description ? (
                  <span className="mt-1 block text-sm leading-6 text-[#43474c]">
                    {link.description}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {linkGroups.length ? (
        <section>
          <h2 className="text-lg font-semibold text-black">
            More ways to explore
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {linkGroups.map((group) => (
              <div
                key={group.title}
                className="rounded-lg border border-[#e2e8f0] bg-white p-4"
              >
                <h3 className="text-sm font-semibold text-[#0b1c30]">
                  {group.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={link.description}
                      className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#0b1c30] transition hover:border-[#0051d5]/30 hover:bg-white hover:text-[#0051d5]"
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

      <section>
        <h2 className="text-lg font-semibold text-black">
          Frequently asked questions
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {visibleFaq.map((entry) => (
            <article
              key={entry.question}
              className="rounded-lg border border-[#e2e8f0] bg-white p-4"
            >
              <h3 className="text-sm font-semibold text-[#0b1c30]">
                {entry.question}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#43474c]">
                {entry.answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )

  return (
    <TaxonomyDetailPage
      carbonPathname={pagePath}
      title={title}
      description={description}
      intro={intro}
      icon={<Compass className="h-10 w-10 text-[#c0ff00]" aria-hidden />}
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch in this directory",
      }}
      secondaryCta={{
        href: PRICING_PATH,
        label: "Explore promotion tiers",
      }}
      tertiaryCta={{
        href: browseHref,
        label: "Open in browse",
      }}
      stats={[
        { label: "Results", value: total },
        { label: "Visible", value: products.length },
        { label: "Verified", value: verifiedCount },
      ]}
      feed={feed}
      feedTestId="pseo-slice-feed-section"
      afterFeed={afterFeed}
      structuredData={structuredData}
    />
  )
}
