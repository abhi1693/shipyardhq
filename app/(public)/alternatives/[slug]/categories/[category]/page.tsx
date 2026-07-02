import type { Metadata } from "next"
import { connection } from "next/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { getAlternativeDetail } from "@/actions/public/alternatives/actions"
import { getCategoryMeta } from "@/actions/public/categories/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { buildPageMetadata } from "@/lib/metadata"
import prisma from "@/lib/prisma"
import {
  ALTERNATIVES_PATH,
  CATEGORIES_PATH,
  HOME_PATH,
  alternativeCategoryPath,
  alternativePath,
  categoryPath,
} from "@/lib/routes"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"
import { buildAlternativeCategoryMatrixCopy } from "@/lib/pseo/matrix-copy"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import { lowerCategoryNounPhrase } from "@/lib/seo/category-phrases"

type AlternativeCategoryParams = {
  slug: string
  category: string
}

export async function generateStaticParams() {
  const alternatives = await prisma.alternativeProduct.findMany({
    where: {
      products: { some: buildPublicDiscoveryProductWhere() },
    },
    select: {
      slug: true,
      categories: {
        select: { slug: true },
      },
    },
  })

  return alternatives.flatMap((alternative) =>
    alternative.categories.map((category) => ({
      slug: alternative.slug,
      category: category.slug,
    })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<AlternativeCategoryParams>
}): Promise<Metadata> {
  const { slug, category: categorySlug } = await params
  const [alternative, category] = await Promise.all([
    getAlternativeDetail(slug),
    getCategoryMeta(categorySlug),
  ])
  if (!alternative || !category) return {}

  const total = await getProductSlicePayload({
    filters: {
      alternativeSlug: slug,
      categorySlug,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((payload) => payload.total)
  await connection()
  const currentYear = new Date().getFullYear()
  const { title, description } = buildAlternativeCategoryMatrixCopy({
    alternativeName: alternative.name,
    categoryName: category.name,
    total,
    currentYear,
  })
  const canonical = pseoCanonicalForTotal(
    alternativeCategoryPath(slug, categorySlug),
    alternativePath(slug),
    total,
  )

  return {
    ...buildPageMetadata({
      title,
      description,
      section: "Alternatives",
      canonical,
      openGraph: { title, description },
      twitter: { title, description },
    }),
    robots: pseoRobotsForTotal(total),
    keywords: [
      `${alternative.name} alternatives for ${category.name.toLowerCase()}`,
      `${lowerCategoryNounPhrase(category.name, "tools")} like ${alternative.name}`,
      `${alternative.name} ${category.name.toLowerCase()} competitors`,
    ],
  }
}

export default function AlternativeCategoryPage(props: {
  params: Promise<AlternativeCategoryParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <AlternativeCategoryPageContent {...props} />
    </Suspense>
  )
}

async function AlternativeCategoryPageContent({
  params,
  searchParams,
}: {
  params: Promise<AlternativeCategoryParams>
  searchParams: Promise<PseoSearchParams>
}) {
  const { slug, category: categorySlug } = await params
  const [alternative, category] = await Promise.all([
    getAlternativeDetail(slug),
    getCategoryMeta(categorySlug),
  ])
  if (!alternative || !category) return notFound()

  const rawSearchParams = await searchParams
  const parsed = parsePseoSearchParams(rawSearchParams)
  const payload = await getProductSlicePayload({
    filters: {
      alternativeSlug: slug,
      categorySlug,
    },
    parsed,
  })

  const pagePath = alternativeCategoryPath(slug, categorySlug)
  const { title, description } = buildAlternativeCategoryMatrixCopy({
    alternativeName: alternative.name,
    categoryName: category.name,
    total: payload.total,
  })

  return (
    <ProductSlicePage
      title={title}
      description={description}
      intro={`This alternatives slice compares ${category.name.toLowerCase()} products positioned around ${alternative.name}. It keeps the category constraint visible so buyers can separate true functional substitutes from broader competitors and then sort by freshness, traction, or name.`}
      pagePath={pagePath}
      scriptKeyPrefix={`alternative-${slug}-category-${categorySlug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Alternatives", path: ALTERNATIVES_PATH },
        { name: alternative.name, path: alternativePath(slug) },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(categorySlug) },
      ]}
      relatedLinks={[
        {
          label: `${alternative.name} alternatives`,
          href: alternativePath(slug),
          description: `Compare every product positioned as an alternative to ${alternative.name}.`,
        },
        {
          label: category.name,
          href: categoryPath(categorySlug),
          description: `Browse every ${lowerCategoryNounPhrase(category.name, "tool")} in this category.`,
        },
        {
          label: "Alternatives",
          href: ALTERNATIVES_PATH,
          description: "Explore competitor and alternative directories.",
        },
      ]}
      products={payload.products}
      total={payload.total}
      hasMore={payload.hasMore}
      parsed={parsed}
      rawSearchParams={rawSearchParams}
      searchParams={{
        alternative: slug,
        category: categorySlug,
      }}
      chips={[alternative.name, category.name]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`${category.name.toLowerCase()} alternatives to ${alternative.name}`}
    />
  )
}
