import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryMeta } from "@/actions/public/categories/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { getCategoryStaticParams } from "@/lib/categories/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  categoryPath,
  verifiedCategoryPath,
} from "@/lib/routes"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type VerifiedCategoryParams = {
  category: string
}

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  const categories = await getCategoryStaticParams()
  return categories.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<VerifiedCategoryParams>
}): Promise<Metadata> {
  const { category: categorySlug } = await params
  const category = await getCategoryMeta(categorySlug)
  if (!category) return {}

  const total = await getProductSlicePayload({
    filters: {
      categorySlug,
      verified: true,
    },
    parsed: { sort: "new", page: 1, verified: true },
    pageSize: 1,
  }).then((payload) => payload.total)
  const title = `Verified ${category.name} tools`
  const description = `Browse ${total} verified ${category.name.toLowerCase()} ${total === 1 ? "product" : "products"} from Shipyard makers.`
  const canonical = verifiedCategoryPath(categorySlug)

  return {
    ...buildPageMetadata({
      title,
      description,
      section: "Verified",
      canonical,
      openGraph: { title, description },
      twitter: { title, description },
    }),
    robots: pseoRobotsForTotal(total),
  }
}

export default async function VerifiedCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<VerifiedCategoryParams>
  searchParams: Promise<PseoSearchParams>
}) {
  const { category: categorySlug } = await params
  const category = await getCategoryMeta(categorySlug)
  if (!category) return notFound()

  const rawSearchParams = await searchParams
  const parsed = parsePseoSearchParams(rawSearchParams)
  const payload = await getProductSlicePayload({
    filters: {
      categorySlug,
      verified: true,
    },
    parsed: { ...parsed, verified: true },
  })

  const pagePath = verifiedCategoryPath(categorySlug)
  const title = `Verified ${category.name} tools`
  const description = `Browse ${payload.total} verified ${category.name.toLowerCase()} ${payload.total === 1 ? "product" : "products"} from Shipyard makers.`

  return (
    <ProductSlicePage
      title={title}
      description={description}
      pagePath={pagePath}
      scriptKeyPrefix={`verified-category-${categorySlug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(categorySlug) },
        { name: "Verified", path: pagePath },
      ]}
      products={payload.products}
      total={payload.total}
      hasMore={payload.hasMore}
      parsed={{ ...parsed, verified: true }}
      rawSearchParams={rawSearchParams}
      searchParams={{
        category: categorySlug,
        verified: true,
      }}
      chips={[category.name, "Verified"]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`verified ${category.name.toLowerCase()} tools`}
    />
  )
}
