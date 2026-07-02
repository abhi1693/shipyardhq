import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import {
  getPublicUseCaseCategoriesWithCounts,
  getPublicUseCasesWithCounts,
} from "@/actions/public/use-cases/actions"
import { ProductSlicePage } from "@/components/templates/public/pseo/ProductSlicePage"
import { buildPageMetadata } from "@/lib/metadata"
import {
  categoryNounPhrase,
  lowerCategoryNounPhrase,
} from "@/lib/seo/category-phrases"
import {
  CATEGORIES_PATH,
  HOME_PATH,
  USE_CASES_PATH,
  categoryPath,
  usecaseCategoryPath,
  usecasePath,
} from "@/lib/routes"
import {
  getProductSlicePayload,
  parsePseoSearchParams,
  pseoRobotsForTotal,
  type PseoSearchParams,
} from "@/lib/pseo/product-slices"

type UseCaseCategoryParams = {
  slug: string
  category: string
}

export async function generateStaticParams() {
  const useCases = await getPublicUseCasesWithCounts()
  const mapped = await Promise.all(
    useCases
      .filter((useCase) => useCase.productCount > 0)
      .map(async (useCase) => {
        const payload = await getPublicUseCaseCategoriesWithCounts(useCase.slug)
        return (payload?.categories ?? []).map((category) => ({
          slug: useCase.slug,
          category: category.slug,
        }))
      }),
  )

  return mapped.flat()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<UseCaseCategoryParams>
}): Promise<Metadata> {
  const { slug, category: categorySlug } = await params
  const payload = await getPublicUseCaseCategoriesWithCounts(slug)
  const useCase = payload?.useCase
  const category = payload?.categories.find(
    (item) => item.slug === categorySlug,
  )
  if (!useCase || !category) return {}

  const total = await getProductSlicePayload({
    filters: {
      useCaseSlug: slug,
      categorySlug,
    },
    parsed: { sort: "new", page: 1, verified: false },
    pageSize: 1,
  }).then((slice) => slice.total)
  const title = `${categoryNounPhrase(category.name, "tools")} to ${useCase.label.toLowerCase()}`
  const description = `Browse ${total} ${category.name.toLowerCase()} ${total === 1 ? "product" : "products"} for teams looking to ${useCase.label.toLowerCase()} on Shipyard.`
  const canonical = usecaseCategoryPath(slug, categorySlug)

  return {
    ...buildPageMetadata({
      title,
      description,
      section: "Use Cases",
      canonical,
      openGraph: { title, description },
      twitter: { title, description },
    }),
    robots: pseoRobotsForTotal(total),
  }
}

export default function UseCaseCategoryPage(props: {
  params: Promise<UseCaseCategoryParams>
  searchParams: Promise<PseoSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <UseCaseCategoryPageContent {...props} />
    </Suspense>
  )
}

async function UseCaseCategoryPageContent({
  params,
  searchParams,
}: {
  params: Promise<UseCaseCategoryParams>
  searchParams: Promise<PseoSearchParams>
}) {
  const { slug, category: categorySlug } = await params
  const payload = await getPublicUseCaseCategoriesWithCounts(slug)
  const useCase = payload?.useCase
  const category = payload?.categories.find(
    (item) => item.slug === categorySlug,
  )
  if (!useCase || !category) return notFound()

  const rawSearchParams = await searchParams
  const parsed = parsePseoSearchParams(rawSearchParams)
  const slice = await getProductSlicePayload({
    filters: {
      useCaseSlug: slug,
      categorySlug,
    },
    parsed,
  })

  const pagePath = usecaseCategoryPath(slug, categorySlug)
  const title = `${categoryNounPhrase(category.name, "tools")} to ${useCase.label.toLowerCase()}`
  const description = `Browse ${slice.total} ${category.name.toLowerCase()} ${slice.total === 1 ? "product" : "products"} for teams looking to ${useCase.label.toLowerCase()} on Shipyard.`

  return (
    <ProductSlicePage
      title={title}
      description={description}
      pagePath={pagePath}
      scriptKeyPrefix={`use-case-${slug}-category-${categorySlug}`}
      breadcrumbs={[
        { name: "Home", path: HOME_PATH },
        { name: "Use Cases", path: USE_CASES_PATH },
        { name: useCase.label, path: usecasePath(slug) },
        { name: "Categories", path: CATEGORIES_PATH },
        { name: category.name, path: categoryPath(categorySlug) },
      ]}
      products={slice.products}
      total={slice.total}
      hasMore={slice.hasMore}
      parsed={parsed}
      rawSearchParams={rawSearchParams}
      searchParams={{
        useCase: slug,
        category: categorySlug,
      }}
      chips={[useCase.label, category.name]}
      itemListName={title}
      itemListDescription={description}
      faqQualifier={`${lowerCategoryNounPhrase(category.name, "tools")} to ${useCase.label.toLowerCase()}`}
    />
  )
}
