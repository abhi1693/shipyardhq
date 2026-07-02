import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { getCategoryMeta } from "@/actions/public/categories/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { buildPageMetadata } from "@/lib/metadata"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  PRICING_PATH,
  categoryPath,
  categoryPricingPath,
  pricingModelPath,
} from "@/lib/routes"
import { getCategoryStaticParams } from "@/lib/categories/page-cache"
import { getPricingModelMeta, PRICING_MODEL_SLUGS } from "@/lib/pricing/models"
import { lowerCategoryNounPhrase } from "@/lib/seo/category-phrases"
import { buildCategoryPricingMatrixCopy } from "@/lib/pseo/matrix-copy"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pricingValueFromMaybe,
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type CategoryPricingParams = {
  slug: string
  pricingModel: string
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
}): Promise<Metadata> {
  const { slug, pricingModel } = await props.params
  const category = await getCategoryMeta(slug)
  const pricingModelMeta = getPricingModelMeta(pricingModel)
  if (!category || !pricingModelMeta) return {}

  const total = await getProductSlicePayload({
    filters: {
      categorySlug: slug,
      pricingModel: pricingModelMeta.value,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((payload) => payload.total)
  const lowerCategoryTools = lowerCategoryNounPhrase(category.name, "tools")
  const { title, description } = buildCategoryPricingMatrixCopy({
    category,
    pricingLabel: pricingModelMeta.label,
    pricingDescription: pricingModelMeta.description,
    total,
  })

  const metadata = buildPageMetadata({
    title,
    description,
    section: "Categories",
    canonical: pseoCanonicalForTotal(
      categoryPricingPath(slug, pricingModelMeta.slug),
      categoryPath(slug),
      total,
    ),
    openGraph: { title, description },
    twitter: { title, description },
  })

  return {
    ...metadata,
    robots: pseoRobotsForTotal(total),
    keywords: [
      `${pricingModelMeta.label.toLowerCase()} ${lowerCategoryTools}`,
      `${pricingModelMeta.label.toLowerCase()} ${category.name.toLowerCase()} software`,
      `${category.name.toLowerCase()} products with ${pricingModelMeta.label.toLowerCase()} pricing`,
    ],
  }
}

export default function CategoryPricingPage(props: {
  params: Promise<CategoryPricingParams>
  searchParams: Promise<PseoSearchParams>
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
  searchParams: Promise<PseoSearchParams>
}) {
  const { slug, pricingModel } = await params
  const pricingModelMeta = getPricingModelMeta(pricingModel)
  const pricingValue = pricingValueFromMaybe(pricingModel)
  if (!pricingModelMeta || !pricingValue) return notFound()

  const category = await getCategoryMeta(slug)
  if (!category) return notFound()

  const resolvedSearchParams = await searchParams
  const parsed = parsePseoSearchParams(resolvedSearchParams)

  const payload = await getProductSlicePayload({
    filters: {
      categorySlug: slug,
      pricingModel: pricingValue,
    },
    parsed,
  })

  const pagePath = categoryPricingPath(slug, pricingModelMeta.slug)
  const resultCount =
    typeof payload.total === "number" && Number.isFinite(payload.total)
      ? payload.total
      : payload.products.length
  const { title: pageTitle, description } = buildCategoryPricingMatrixCopy({
    category,
    pricingLabel: pricingModelMeta.label,
    pricingDescription: pricingModelMeta.description,
    total: resultCount,
  })

  return (
    <ProductSlicePage
      title={pageTitle}
      description={description}
      intro={`${pricingModelMeta.label} pricing changes how buyers compare ${lowerCategoryNounPhrase(category.name, "tools")}: this page narrows the category to products that publish that pricing model, then keeps the current sort and verification filters available for deeper evaluation.`}
      pagePath={pagePath}
      scriptKeyPrefix={`category-${slug}-pricing-${pricingModelMeta.slug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(slug) },
        { name: pricingModelMeta.label, path: pagePath },
      ]}
      relatedLinks={[
        {
          label: category.name,
          href: categoryPath(slug),
          description: `Browse every ${lowerCategoryNounPhrase(category.name, "tool")} in this category.`,
        },
        {
          label: `${pricingModelMeta.label} pricing`,
          href: pricingModelPath(pricingModelMeta.slug),
          description: `Compare all Shipyard products with ${pricingModelMeta.label.toLowerCase()} pricing.`,
        },
        {
          label: "Pricing models",
          href: PRICING_PATH,
          description: "Browse product directories by pricing model.",
        },
      ]}
      products={payload.products}
      total={resultCount}
      hasMore={payload.hasMore}
      parsed={parsed}
      rawSearchParams={resolvedSearchParams}
      searchParams={{
        category: slug,
        pricingModel: pricingModelMeta.slug,
      }}
      chips={[category.name, `${pricingModelMeta.label} pricing`]}
      itemListName={pageTitle}
      itemListDescription={description}
      faqQualifier={`${pricingModelMeta.label.toLowerCase()} ${lowerCategoryNounPhrase(category.name, "tools")}`}
    />
  )
}
