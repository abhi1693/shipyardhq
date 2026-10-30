import {
  directoryPagePath,
  parseDirectoryPage,
  hasDirectoryFilters,
  type DirectorySearchParams,
} from "@/lib/directory/pagination"
import { NOINDEX_FOLLOW_ROBOTS } from "@/lib/seo/indexing"
import type { Metadata } from "next"
import { Suspense } from "react"
import { JsonLdScript } from "next-seo"

import { CategoryDetailPageContent } from "@/components/templates/public/categories/detail/page-content"
import { TaxonomyDetailSkeleton } from "@/components/templates/public/common/TaxonomyDetailSkeleton"
import { getCategoryMeta } from "@/actions/public/categories/actions"
import { buildMetaDescription, buildPageMetadata } from "@/lib/metadata"
import {
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
} from "@/lib/pseo/product-slices"
import {
  getCategoryDetailPayload,
  getCategoryStaticParams,
} from "@/lib/categories/page-cache"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { CATEGORIES_PATH, HOME_PATH, categoryPath } from "@/lib/routes"
import { pluralize } from "@/lib/pluralize"
import { buildProductListItem } from "@/lib/seo/product-list"
import { resolveSiteUrl } from "@/lib/siteConfig"

export async function generateStaticParams() {
  return getCategoryStaticParams()
}

export async function generateMetadata(
  props: Parameters<typeof CategoryDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const query = (await props.searchParams) ?? {}
  const page = parseDirectoryPage(query.page)
  const category = await getCategoryMeta(slug)
  if (!category) return {}

  const data = page ? await getCategoryDetailPayload(slug, page) : null
  const productCount = data?.productsPage.total ?? category._count.products
  const fallbackDescription = `Explore ${productCount.toLocaleString("en-US")} ${pluralize(
    productCount,
    "product",
  )} in ${category.name}. Discover launch-ready tools, compare makers, and find new products on Shipyard.`
  const categoryDescription = category.description?.trim()
  const description =
    buildMetaDescription(
      categoryDescription
        ? `${categoryDescription} Browse ${productCount.toLocaleString("en-US")} ${pluralize(
            productCount,
            "product",
          )} curated for makers comparing launch-ready apps, SaaS tools, APIs, and startup products.`
        : fallbackDescription,
      fallbackDescription,
    ) ?? fallbackDescription
  const canonical = pseoCanonicalForTotal(
    directoryPagePath(categoryPath(slug), page ?? 1),
    CATEGORIES_PATH,
    productCount,
  )

  const metadata = buildPageMetadata({
    title: category.name,
    section: "Categories",
    description,
    canonical,
    openGraph: {
      url: canonical,
      description,
    },
    twitter: {
      description,
    },
  })

  return {
    ...metadata,
    robots:
      page === null ||
      hasDirectoryFilters(query) ||
      (page > 1 && !data?.productsPage.products.length)
        ? NOINDEX_FOLLOW_ROBOTS
        : pseoRobotsForTotal(productCount),
  }
}

export default function CategoryPage(
  props: Parameters<typeof CategoryDetailPageContent>[0],
) {
  const paramsPromise = props.params
  return (
    <Suspense fallback={<TaxonomyDetailSkeleton />}>
      <CategoryStructuredData
        params={paramsPromise}
        searchParams={props.searchParams}
      />
      <CategoryDetailPageContent {...props} />
    </Suspense>
  )
}

async function CategoryStructuredData({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<DirectorySearchParams>
}) {
  const { slug } = await params
  const query = (await searchParams) ?? {}
  const page = parseDirectoryPage(query.page)
  if (page === null) return null
  const payload = await getCategoryDetailPayload(slug, page)
  if (!payload) return null

  const path = directoryPagePath(categoryPath(slug), page)
  const siteUrl = resolveSiteUrl()
  const pageUrl = `${siteUrl}${path}`
  const categoryName = payload.category.name || "Category"
  const breadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Categories", path: CATEGORIES_PATH },
    { name: categoryName, path },
  ]
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    name: `${categoryName} products`,
    description: `Browse ${payload.productsPage.total} ${pluralize(
      payload.productsPage.total,
      "product",
    )} in ${categoryName} on Shipyard.`,
    numberOfItems: payload.productsPage.total,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: payload.productsPage.products
      .slice(0, 20)
      .map((product, index) =>
        buildProductListItem({
          product,
          position: (page - 1) * payload.productsPage.pageSize + index + 1,
          siteUrl,
          categoryName,
        }),
      ),
  }

  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix={`category-${slug}`}
        webPage={{ path, name: categoryName }}
        breadcrumbs={{ items: breadcrumbs }}
      />
      <JsonLdScript
        data={itemList}
        scriptKey={`category-${slug}-itemlist-jsonld`}
      />
    </>
  )
}
