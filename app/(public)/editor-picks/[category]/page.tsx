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
  editorPickCategoryPath,
} from "@/lib/routes"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type EditorPickCategoryParams = {
  category: string
}

const EDITOR_PICK_BADGE = "editor-pick"

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  const categories = await getCategoryStaticParams()
  return categories.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<EditorPickCategoryParams>
}): Promise<Metadata> {
  const { category: categorySlug } = await params
  const category = await getCategoryMeta(categorySlug)
  if (!category) return {}

  const total = await getProductSlicePayload({
    filters: {
      categorySlug,
      badge: EDITOR_PICK_BADGE,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((payload) => payload.total)
  const title = `Editor's picks for ${category.name}`
  const description = `Browse ${total} editor-picked ${category.name.toLowerCase()} ${total === 1 ? "product" : "products"} curated on Shipyard.`
  const canonical = editorPickCategoryPath(categorySlug)

  return {
    ...buildPageMetadata({
      title,
      description,
      section: "Editor's Picks",
      canonical,
      openGraph: { title, description },
      twitter: { title, description },
    }),
    robots: pseoRobotsForTotal(total),
  }
}

export default async function EditorPickCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<EditorPickCategoryParams>
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
      badge: EDITOR_PICK_BADGE,
    },
    parsed,
  })

  const pagePath = editorPickCategoryPath(categorySlug)
  const title = `Editor's picks for ${category.name}`
  const description = `Browse ${payload.total} editor-picked ${category.name.toLowerCase()} ${payload.total === 1 ? "product" : "products"} curated on Shipyard.`

  return (
    <ProductSlicePage
      title={title}
      description={description}
      pagePath={pagePath}
      scriptKeyPrefix={`editor-picks-category-${categorySlug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(categorySlug) },
        { name: "Editor's Picks", path: pagePath },
      ]}
      products={payload.products}
      total={payload.total}
      hasMore={payload.hasMore}
      parsed={parsed}
      rawSearchParams={rawSearchParams}
      searchParams={{
        category: categorySlug,
        badge: EDITOR_PICK_BADGE,
      }}
      chips={[category.name, "Editor's Pick"]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`editor-picked ${category.name.toLowerCase()} tools`}
    />
  )
}
