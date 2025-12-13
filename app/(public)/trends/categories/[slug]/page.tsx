import type { Metadata } from "next"
import { notFound } from "next/navigation"

import prisma from "@/lib/prisma"
import {
  getProductInterestSignalsMap,
  getTrendingCategoryProductIds,
} from "@/lib/server/analytics/productInterest"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { toProductCardItem } from "@/lib/products/card-item"
import ProductGrid from "@/components/molecules/ProductGrid"
import { buildPageMetadata } from "@/lib/metadata"
import { CATEGORIES_PATH, HOME_PATH, categoryPath } from "@/lib/routes"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"

interface CategoryTrendsPageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

export async function generateMetadata(
  props: CategoryTrendsPageProps,
): Promise<Metadata> {
  const { slug } = await props.params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true, slug: true },
  })

  if (!category) return {}

  const canonical = `/trends/categories/${category.slug}`
  const title = `Trending tools in ${category.name}`
  return buildPageMetadata({
    title,
    section: "Trends",
    description:
      category.description ?? `Most clicked tools in ${category.name} this week.`,
    canonical,
  })
}

export default async function TrendingToolsInCategoryPage({
  params,
}: CategoryTrendsPageProps) {
  const { slug } = await params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, description: true, slug: true },
  })

  if (!category) notFound()

  const ids = await getTrendingCategoryProductIds({
    categorySlug: category.slug,
    days: 7,
    limit: 60,
  })

  const path = `/trends/categories/${category.slug}`
  const breadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Categories", path: CATEGORIES_PATH },
    { name: category.name, path: categoryPath(category.slug) },
    { name: "Trending", path },
  ]

  if (!ids.length) {
    return (
      <main className="relative isolate bg-[#f5f7fb]">
        <CoreStructuredData
          scriptKeyPrefix={`trends-category-${category.slug}`}
          webPage={{ path, name: `Trending tools in ${category.name}` }}
          breadcrumbs={{ items: breadcrumbs }}
        />
        <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-12">
          <header className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Trending tools in {category.name}
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              No data yet — check back soon.
            </p>
          </header>
        </div>
      </main>
    )
  }

  const records = (await prisma.product.findMany({
    where: {
      id: { in: ids },
      status: "published",
      category: { is: { slug: category.slug } },
    },
    select: productCardSelect,
  })) as unknown as ProductCardRecord[]

  if (!records.length) notFound()

  const recordMap = new Map<string, ProductCardRecord>(
    records.map((record) => [record.id, record]),
  )
  const ordered = ids
    .map((id) => recordMap.get(id))
    .filter((record): record is ProductCardRecord => Boolean(record))

  const interestMap = await getProductInterestSignalsMap({
    products: ordered.map((record) => ({ id: record.id, slug: record.slug })),
  })

  const now = new Date()
  const items = ordered.map((record) =>
    toProductCardItem({
      ...mapProductCardRecordToBase(record, now),
      interest: interestMap.get(record.id) ?? null,
    }),
  )

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <CoreStructuredData
        scriptKeyPrefix={`trends-category-${category.slug}`}
        webPage={{ path, name: `Trending tools in ${category.name}` }}
        breadcrumbs={{ items: breadcrumbs }}
      />
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-12">
        <header className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Trending tools in {category.name}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Most clicked in the last 7 days.
          </p>
        </header>

        <div className="mt-10">
          <ProductGrid items={items} className="space-y-5" />
        </div>
      </div>
    </main>
  )
}
