import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { getCategoryMeta } from "@/actions/public/categories/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { getCategoryStaticParams } from "@/lib/categories/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import { lowerCategoryNounPhrase } from "@/lib/seo/category-phrases"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  categoryPath,
  verifiedCategoryPath,
} from "@/lib/routes"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"
import { buildVerifiedCategoryMatrixCopy } from "@/lib/pseo/matrix-copy"

type VerifiedCategoryParams = {
  category: string
}

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
  const { title, description } = buildVerifiedCategoryMatrixCopy({
    categoryName: category.name,
    total,
  })
  const canonical = pseoCanonicalForTotal(
    verifiedCategoryPath(categorySlug),
    categoryPath(categorySlug),
    total,
  )

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

export default function VerifiedCategoryPage(props: {
  params: Promise<VerifiedCategoryParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <VerifiedCategoryPageContent {...props} />
    </Suspense>
  )
}

async function VerifiedCategoryPageContent({
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
  const { title, description } = buildVerifiedCategoryMatrixCopy({
    categoryName: category.name,
    total: payload.total,
  })

  return (
    <ProductSlicePage
      title={title}
      description={description}
      intro={`Verified ${lowerCategoryNounPhrase(category.name, "tools")} are products where Shipyard has a stronger maker or profile signal than a basic listing. Use this slice when trust markers, active launch pages, and clean public product metadata matter as much as category fit.`}
      pagePath={pagePath}
      scriptKeyPrefix={`verified-category-${categorySlug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(categorySlug) },
        { name: "Verified", path: pagePath },
      ]}
      relatedLinks={[
        {
          label: category.name,
          href: categoryPath(categorySlug),
          description: `Browse every ${lowerCategoryNounPhrase(category.name, "tool")} in this category.`,
        },
        {
          label: "Categories",
          href: CATEGORIES_PATH,
          description: "Explore all Shipyard category directories.",
        },
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
      faqQualifier={`verified ${lowerCategoryNounPhrase(category.name, "tools")}`}
    />
  )
}
