import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { getCategoryMeta } from "@/actions/public/categories/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { getCategoryStaticParams } from "@/lib/categories/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  PRODUCT_TYPES_PATH,
  categoryPath,
  categoryProductTypePath,
  productTypePath,
} from "@/lib/routes"
import {
  PRODUCT_TYPE_SLUGS,
  getProductTypeMeta,
} from "@/lib/product-types/models"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  productTypeValueFromMaybe,
  PSEO_INTERSECTION_ROBOTS,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"
import { buildCategoryProductTypeMatrixCopy } from "@/lib/pseo/matrix-copy"
import { lowerCategoryNounPhrase } from "@/lib/seo/category-phrases"

type CategoryProductTypeParams = {
  slug: string
  productType: string
}

export async function generateStaticParams() {
  const categories = await getCategoryStaticParams()

  return categories.flatMap((category) =>
    PRODUCT_TYPE_SLUGS.map((productType) => ({
      slug: category.slug,
      productType,
    })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CategoryProductTypeParams>
}): Promise<Metadata> {
  const { slug, productType } = await params
  const category = await getCategoryMeta(slug)
  const productTypeMeta = getProductTypeMeta(productType)
  if (!category || !productTypeMeta) return {}

  const total = await getProductSlicePayload({
    filters: {
      categorySlug: slug,
      productType: productTypeMeta.value,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((payload) => payload.total)
  const { title, description } = buildCategoryProductTypeMatrixCopy({
    category,
    productTypeLabel: productTypeMeta.label,
    productTypeDescription: productTypeMeta.description,
    total,
  })
  const canonical = categoryProductTypePath(slug, productTypeMeta.slug)

  return {
    ...buildPageMetadata({
      title,
      description,
      section: "Categories",
      canonical,
      openGraph: { title, description },
      twitter: { title, description },
    }),
    robots: PSEO_INTERSECTION_ROBOTS,
    keywords: [
      `${category.name.toLowerCase()} ${productTypeMeta.label.toLowerCase()} products`,
      `${lowerCategoryNounPhrase(category.name, "tools")} ${productTypeMeta.label.toLowerCase()}`,
      `${productTypeMeta.label.toLowerCase()} ${category.name.toLowerCase()} software`,
    ],
  }
}

export default function CategoryProductTypePage(props: {
  params: Promise<CategoryProductTypeParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <CategoryProductTypePageContent {...props} />
    </Suspense>
  )
}

async function CategoryProductTypePageContent({
  params,
  searchParams,
}: {
  params: Promise<CategoryProductTypeParams>
  searchParams: Promise<PseoSearchParams>
}) {
  const { slug, productType } = await params
  const category = await getCategoryMeta(slug)
  const productTypeMeta = getProductTypeMeta(productType)
  const productTypeValue = productTypeValueFromMaybe(productType)
  if (!category || !productTypeMeta || !productTypeValue) return notFound()

  const rawSearchParams = await searchParams
  const parsed = parsePseoSearchParams(rawSearchParams)
  const payload = await getProductSlicePayload({
    filters: {
      categorySlug: slug,
      productType: productTypeValue,
    },
    parsed,
  })

  const pagePath = categoryProductTypePath(slug, productTypeMeta.slug)
  const { title, description } = buildCategoryProductTypeMatrixCopy({
    category,
    productTypeLabel: productTypeMeta.label,
    productTypeDescription: productTypeMeta.description,
    total: payload.total,
  })

  return (
    <ProductSlicePage
      title={title}
      description={description}
      intro={`${productTypeMeta.label} products in ${category.name.toLowerCase()} solve different buyer jobs than broader category lists: this slice focuses on format, delivery model, and category fit so teams can compare ${lowerCategoryNounPhrase(category.name, "tools")} that match the way they plan to adopt software.`}
      pagePath={pagePath}
      scriptKeyPrefix={`category-${slug}-product-type-${productTypeMeta.slug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(slug) },
        { name: productTypeMeta.label, path: pagePath },
      ]}
      relatedLinks={[
        {
          label: category.name,
          href: categoryPath(slug),
          description: `Browse every ${lowerCategoryNounPhrase(category.name, "tool")} in this category.`,
        },
        {
          label: `${productTypeMeta.label} products`,
          href: productTypePath(productTypeMeta.slug),
          description: `Compare all ${productTypeMeta.label.toLowerCase()} launches on Shipyard.`,
        },
        {
          label: "Product types",
          href: PRODUCT_TYPES_PATH,
          description:
            "Browse directories by software format and product type.",
        },
      ]}
      products={payload.products}
      total={payload.total}
      hasMore={payload.hasMore}
      parsed={parsed}
      rawSearchParams={rawSearchParams}
      searchParams={{
        category: slug,
        productType: productTypeMeta.slug,
      }}
      chips={[category.name, productTypeMeta.label]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`${category.name.toLowerCase()} ${productTypeMeta.label.toLowerCase()} products`}
    />
  )
}
