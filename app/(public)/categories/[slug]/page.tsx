export const revalidate = 120

import type { Metadata } from "next"
import { Suspense } from "react"

import { CategoryDetailPageContent } from "@/components/templates/public/categories/detail/page-content"
import { CategoryDetailSkeleton } from "@/components/templates/public/categories/detail/skeleton"
import { getCategoryMeta } from "@/actions/public/categories/actions"
import { buildPageMetadata } from "@/lib/metadata"
import {
  getCategoryDetailPayload,
  getCategoryStaticParams,
} from "@/lib/categories/page-cache"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { CATEGORIES_PATH, HOME_PATH, categoryPath } from "@/lib/routes"

// export const generateStaticParams = getCategoryStaticParams

export async function generateMetadata(
  props: Parameters<typeof CategoryDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const category = await getCategoryMeta(slug)
  if (!category) return {}

  return buildPageMetadata({
    title: category.name,
    section: "Categories",
    description: category.description ?? undefined,
  })
}

export default function CategoryPage(
  props: Parameters<typeof CategoryDetailPageContent>[0],
) {
  const paramsPromise = props.params
  return (
    <Suspense fallback={<CategoryDetailSkeleton />}>
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
