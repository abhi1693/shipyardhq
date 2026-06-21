import type { Metadata } from "next"
import { Suspense } from "react"

import { CategoryDetailPageContent } from "@/components/templates/public/categories/detail/page-content"
import { TaxonomyDetailSkeleton } from "@/components/templates/public/common/TaxonomyDetailSkeleton"
import { getCategoryMeta } from "@/actions/public/categories/actions"
import { buildMetaDescription, buildPageMetadata } from "@/lib/metadata"
import {
  getCategoryDetailPayload,
  getCategoryStaticParams,
} from "@/lib/categories/page-cache"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { CATEGORIES_PATH, HOME_PATH, categoryPath } from "@/lib/routes"
import { pluralize } from "@/lib/pluralize"

export async function generateStaticParams() {
  return getCategoryStaticParams()
}

export async function generateMetadata(
  props: Parameters<typeof CategoryDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const category = await getCategoryMeta(slug)
  if (!category) return {}

  const productCount = category._count.products
  const fallbackDescription = `Explore ${productCount.toLocaleString("en-US")} ${pluralize(
    productCount,
    "product",
  )} in ${category.name}. Discover launch-ready tools, compare makers, and find new products on Shipyard.`
  const description =
    buildMetaDescription(category.description, fallbackDescription) ??
    fallbackDescription
  const canonical = categoryPath(slug)

  return buildPageMetadata({
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
}

export default function CategoryPage(
  props: Parameters<typeof CategoryDetailPageContent>[0],
) {
  const paramsPromise = props.params
  return (
    <Suspense fallback={<TaxonomyDetailSkeleton />}>
      <CategoryStructuredData params={paramsPromise} />
      <CategoryDetailPageContent {...props} />
    </Suspense>
  )
}

async function CategoryStructuredData({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await getCategoryDetailPayload(slug)
  if (!payload) return null

  const path = categoryPath(slug)
  const categoryName = payload.category.name || "Category"
  const breadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Categories", path: CATEGORIES_PATH },
    { name: categoryName, path },
  ]

  return (
    <>
      <CoreStructuredData
        scriptKeyPrefix={`category-${slug}`}
        webPage={{ path, name: categoryName }}
        breadcrumbs={{ items: breadcrumbs }}
      />
    </>
  )
}
