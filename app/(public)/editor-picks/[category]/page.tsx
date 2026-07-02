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
  categoryPath,
  editorPickCategoryPath,
} from "@/lib/routes"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pseoCanonicalForTotal,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"
import { buildEditorPickCategoryMatrixCopy } from "@/lib/pseo/matrix-copy"
import { lowerCategoryNounPhrase } from "@/lib/seo/category-phrases"

type EditorPickCategoryParams = {
  category: string
}

const EDITOR_PICK_BADGE = "editor-pick"

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
  const { title, description } = buildEditorPickCategoryMatrixCopy({
    categoryName: category.name,
    total,
  })
  const canonical = pseoCanonicalForTotal(
    editorPickCategoryPath(categorySlug),
    categoryPath(categorySlug),
    total,
  )

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

export default function EditorPickCategoryPage(props: {
  params: Promise<EditorPickCategoryParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <EditorPickCategoryPageContent {...props} />
    </Suspense>
  )
}

async function EditorPickCategoryPageContent({
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
  const { title, description } = buildEditorPickCategoryMatrixCopy({
    categoryName: category.name,
    total: payload.total,
  })

  return (
    <ProductSlicePage
      title={title}
      description={description}
      intro={`Editor's picks for ${category.name.toLowerCase()} highlight products with stronger curation signals than the default category feed. This slice is useful when buyers want a shorter research list before checking product fit, pricing, verification, and launch activity.`}
      pagePath={pagePath}
      scriptKeyPrefix={`editor-picks-category-${categorySlug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(categorySlug) },
        { name: "Editor's Picks", path: pagePath },
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
      parsed={parsed}
      rawSearchParams={rawSearchParams}
      searchParams={{
        category: categorySlug,
        badge: EDITOR_PICK_BADGE,
      }}
      chips={[category.name, "Editor's Pick"]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`editor-picked ${lowerCategoryNounPhrase(category.name, "tools")}`}
    />
  )
}
