import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { getCategoryMeta } from "@/actions/public/categories/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { buildPageMetadata } from "@/lib/metadata"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  PLATFORMS_PATH,
  categoryPath,
  categoryPlatformPath,
  platformPath,
} from "@/lib/routes"
import { getCategoryStaticParams } from "@/lib/categories/page-cache"
import { getPlatformMeta, PLATFORM_SLUGS } from "@/lib/platforms/config"
import { lowerCategoryNounPhrase } from "@/lib/seo/category-phrases"
import { buildCategoryPlatformMatrixCopy } from "@/lib/pseo/matrix-copy"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  platformValueFromMaybe,
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type CategoryPlatformParams = {
  slug: string
  platform: string
}

export async function generateStaticParams() {
  const categories = await getCategoryStaticParams()

  return categories.flatMap((category) =>
    PLATFORM_SLUGS.map((platform) => ({
      slug: category.slug,
      platform,
    })),
  )
}

export async function generateMetadata(props: {
  params: Promise<CategoryPlatformParams>
}): Promise<Metadata> {
  const { slug, platform } = await props.params
  const category = await getCategoryMeta(slug)
  const platformMeta = getPlatformMeta(platform)
  if (!category || !platformMeta) return {}

  const total = await getProductSlicePayload({
    filters: {
      categorySlug: slug,
      platform: platformMeta.value,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((payload) => payload.total)
  const lowerCategoryTools = lowerCategoryNounPhrase(category.name, "tools")
  const { title, description } = buildCategoryPlatformMatrixCopy({
    category,
    platformLabel: platformMeta.label,
    platformDescription: platformMeta.description,
    total,
  })

  const metadata = buildPageMetadata({
    title,
    description,
    section: "Categories",
    canonical: pseoCanonicalForTotal(
      categoryPlatformPath(slug, platformMeta.slug),
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
      `${lowerCategoryTools} for ${platformMeta.label.toLowerCase()}`,
      `${category.name.toLowerCase()} ${platformMeta.label.toLowerCase()} apps`,
      `${platformMeta.label.toLowerCase()} ${category.name.toLowerCase()} software`,
    ],
  }
}

export default function CategoryPlatformPage(props: {
  params: Promise<CategoryPlatformParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <CategoryPlatformPageContent {...props} />
    </Suspense>
  )
}

async function CategoryPlatformPageContent({
  params,
  searchParams,
}: {
  params: Promise<CategoryPlatformParams>
  searchParams: Promise<PseoSearchParams>
}) {
  const { slug, platform } = await params
  const category = await getCategoryMeta(slug)
  const platformMeta = getPlatformMeta(platform)
  const platformValue = platformValueFromMaybe(platform)
  if (!category || !platformMeta || !platformValue) return notFound()

  const resolvedSearchParams = await searchParams
  const parsed = parsePseoSearchParams(resolvedSearchParams)

  const payload = await getProductSlicePayload({
    filters: {
      categorySlug: slug,
      platform: platformValue,
    },
    parsed,
  })

  const pagePath = categoryPlatformPath(slug, platformMeta.slug)
  const resultCount =
    typeof payload.total === "number" && Number.isFinite(payload.total)
      ? payload.total
      : payload.products.length
  const { title: pageTitle, description } = buildCategoryPlatformMatrixCopy({
    category,
    platformLabel: platformMeta.label,
    platformDescription: platformMeta.description,
    total: resultCount,
  })

  return (
    <ProductSlicePage
      title={pageTitle}
      description={description}
      intro={`${platformMeta.label} support matters when ${lowerCategoryNounPhrase(category.name, "tools")} need to fit an existing workflow. This page narrows ${category.name.toLowerCase()} listings to products marked for ${platformMeta.label}, then keeps freshness, verification, and public discovery signals available for comparison.`}
      pagePath={pagePath}
      scriptKeyPrefix={`category-${slug}-platform-${platformMeta.slug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(slug) },
        { name: platformMeta.label, path: pagePath },
      ]}
      relatedLinks={[
        {
          label: category.name,
          href: categoryPath(slug),
          description: `Browse every ${lowerCategoryNounPhrase(category.name, "tool")} in this category.`,
        },
        {
          label: `${platformMeta.label} products`,
          href: platformPath(platformMeta.slug),
          description: `Compare all Shipyard products that support ${platformMeta.label}.`,
        },
        {
          label: "Platforms",
          href: PLATFORMS_PATH,
          description: "Browse product directories by supported platform.",
        },
      ]}
      products={payload.products}
      total={resultCount}
      hasMore={payload.hasMore}
      parsed={parsed}
      rawSearchParams={resolvedSearchParams}
      searchParams={{
        category: slug,
        platform: platformMeta.slug,
      }}
      chips={[category.name, platformMeta.label]}
      itemListName={pageTitle}
      itemListDescription={description}
      faqQualifier={`${lowerCategoryNounPhrase(category.name, "tools")} for ${platformMeta.label}`}
    />
  )
}
