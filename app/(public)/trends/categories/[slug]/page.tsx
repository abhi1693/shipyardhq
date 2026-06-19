import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import prisma from "@/lib/prisma"
import { getCategoryStaticParams } from "@/lib/categories/page-cache"
import {
  getProductInterestSignalsMap,
  getTrendingCategoryProductIds,
} from "@/lib/server/analytics/productInterest"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import { getPriorityPlacementPlanIds } from "@/lib/products/priority-plans"
import { toProductCardItem } from "@/lib/products/card-item"
import { buildPageMetadata } from "@/lib/metadata"
import {
  BROWSE_PATH,
  CATEGORIES_PATH,
  HOME_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  categoryPath,
} from "@/lib/routes"
import { buildProductListItem } from "@/lib/seo/product-list"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { TaxonomyDetailSkeleton } from "@/components/templates/public/common/TaxonomyDetailSkeleton"
import { TaxonomyTrafficStatsSidebar } from "@/components/templates/public/common/TaxonomyTrafficStatsSidebar"
import { getTaxonomySponsorProducts } from "@/components/templates/public/common/taxonomy-sponsors"
import {
  mapProductCardBaseToTaxonomyFeedItem,
  TaxonomyProductRow,
} from "@/components/templates/public/common/TaxonomyProductRows"
import { pluralize } from "@/lib/pluralize"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"

interface CategoryTrendsPageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | undefined>>
}

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  return getCategoryStaticParams()
}

const TREND_WINDOW_DAYS = 7

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
      category.description ??
      `Most clicked tools in ${category.name} this week.`,
    canonical,
  })
}

export default function TrendingToolsInCategoryPage(
  props: CategoryTrendsPageProps,
) {
  return (
    <Suspense fallback={<TaxonomyDetailSkeleton />}>
      <TrendingToolsInCategoryPageContent {...props} />
    </Suspense>
  )
}

async function TrendingToolsInCategoryPageContent({
  params,
}: CategoryTrendsPageProps) {
  const { slug } = await params
  const [category, taxonomySponsors] = await Promise.all([
    prisma.category.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        slug: true,
        icon: true,
      },
    }),
    getTaxonomySponsorProducts(),
  ])

  if (!category) notFound()

  const ids = await getTrendingCategoryProductIds({
    categorySlug: category.slug,
    days: TREND_WINDOW_DAYS,
    limit: 60,
  })

  const path = `/trends/categories/${category.slug}`
  const breadcrumbs = [
    { name: "Home", path: HOME_PATH },
    { name: "Categories", path: CATEGORIES_PATH },
    { name: category.name, path: categoryPath(category.slug) },
    { name: "Trending", path },
  ]

  const records: ProductCardRecord[] = ids.length
    ? ((await prisma.product.findMany({
        where: buildPublicDiscoveryProductWhere({
          id: { in: ids },
          category: { is: { slug: category.slug } },
        }),
        select: productCardSelect,
      })) as unknown as ProductCardRecord[])
    : []

  const recordMap = new Map<string, ProductCardRecord>(
    records.map((record) => [record.id, record]),
  )
  const ordered = ids
    .map((id) => recordMap.get(id))
    .filter((record): record is ProductCardRecord => Boolean(record))

  const [interestMap, priorityPlanIds] = await Promise.all([
    ordered.length
      ? getProductInterestSignalsMap({
          products: ordered.map((record) => ({
            id: record.id,
            slug: record.slug,
          })),
        })
      : Promise.resolve(new Map()),
    getPriorityPlacementPlanIds(),
  ])

  const now = new Date()
  const items = ordered.map((record) =>
    toProductCardItem({
      ...mapProductCardRecordToBase(record, now, { priorityPlanIds }),
      interest: interestMap.get(record.id) ?? null,
    }),
  )
  const feedItems = items.map((item) =>
    mapProductCardBaseToTaxonomyFeedItem(item),
  )

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://shipyardhq.dev"
  ).replace(/\/$/, "")
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Trending tools in ${category.name}`,
    description: `Browse ${items.length} trending ${pluralize(items.length, "tool")} in ${category.name}.`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items.slice(0, 20).map((product, index) =>
      buildProductListItem({
        product,
        position: index + 1,
        siteUrl: baseUrl,
        categoryName: category.name,
      }),
    ),
  }
  const structuredData = (
    <>
      <CoreStructuredData
        scriptKeyPrefix={`trends-category-${category.slug}`}
        webPage={{ path, name: `Trending tools in ${category.name}` }}
        breadcrumbs={{ items: breadcrumbs }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
    </>
  )

  return (
    <TaxonomyDetailPage
      title={`Trending tools in ${category.name}`}
      description={`Most clicked tools in ${category.name} over the last ${TREND_WINDOW_DAYS} days.`}
      icon={
        <CategoryIcon
          icon={category.icon}
          size={40}
          className="text-[#c0ff00]"
        />
      }
      primaryCta={{
        href: MEMBER_PRODUCTS_ADD_PATH,
        label: "Launch in this category",
      }}
      secondaryCta={{
        href: categoryPath(category.slug),
        label: "View category",
      }}
      tertiaryCta={{
        href: `${BROWSE_PATH}?category=${encodeURIComponent(category.slug)}`,
        label: "Browse category",
      }}
      stats={[
        { label: "Trending Tools", value: items.length },
        { label: "Window", value: `${TREND_WINDOW_DAYS}D` },
      ]}
      feed={<TrendingCategoryFeed products={feedItems} />}
      feedTestId="trending-category-feed-section"
      structuredData={structuredData}
      sponsorProducts={taxonomySponsors}
      trafficStats={<TaxonomyTrafficStatsSidebar />}
    />
  )
}

function TrendingCategoryFeed({ products }: { products: HomepageFeedItem[] }) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c]">
        No trend data yet. Check back soon.
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-black">
          Most clicked this week
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#43474c]">
          {products.length} {pluralize(products.length, "tool")}
        </span>
      </div>
      <div className="space-y-3">
        {products.map((product) => (
          <TaxonomyProductRow key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
