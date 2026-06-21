import { Suspense } from "react"

import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import {
  TaxonomyIndexPage,
  type TaxonomyIndexItem,
} from "@/components/templates/public/common/TaxonomyIndexPage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { CATEGORIES_PATH, HOME_PATH, categoryPath } from "@/lib/routes"
import { getCategoriesPagePayload } from "@/lib/categories/cache"
import { buildPageMetadata } from "@/lib/metadata"
import { BRAND_NAME } from "@/lib/brand"

const PAGE_TITLE = "Categories"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Browse app launch categories on ${BRAND_NAME} and discover SaaS tools, AI products, mobile apps, APIs, and startup projects.`,
  canonical: CATEGORIES_PATH,
})

export default function CategoriesPage() {
  return (
    <Suspense fallback={null}>
      <CategoriesPageContent />
    </Suspense>
  )
}

async function CategoriesPageContent() {
  const {
    categories,
    highlightCategories,
    categoryCount,
    totalProducts,
    averagePerCategory,
    busiestCategory,
  } = await getCategoriesPagePayload()

  const items: TaxonomyIndexItem[] = categories.map((category, index) => ({
    key: category.id,
    title: category.name,
    description: category.description,
    href: categoryPath(category.slug),
    count: category.count ?? 0,
    icon: (
      <CategoryIcon icon={category.icon} size={20} className="text-current" />
    ),
    momentum: 4.8 + (index % 4) * 1.9,
    tone: index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange",
  }))

  const highlightIds = new Set(
    highlightCategories.map((category) => category.id),
  )
  const trendingItems = items.filter((item) => highlightIds.has(item.key))

  return (
    <TaxonomyIndexPage
      title="Discover categories built for every launch"
      description="Browse the launch lanes where founders, operators, and builder-fans discover products by market and workflow."
      searchPlaceholder={`Search ${categoryCount.toLocaleString()} categories...`}
      itemsHeading="All Categories"
      items={items}
      totalItems={categoryCount}
      trendingItems={trendingItems}
      pulseTitle="Category Pulse"
      pulseStats={[
        { label: "Active categories", value: categoryCount.toLocaleString() },
        { label: "Mapped products", value: totalProducts.toLocaleString() },
        {
          label: "Average per category",
          value: averagePerCategory.toLocaleString(),
        },
        {
          label: "Busiest category",
          value: busiestCategory?.name ?? "No categories yet",
        },
      ]}
      quickLinksTitle="Popular Categories"
      emptyTitle="No categories yet"
      emptyDescription="Once products are assigned to categories, this directory will populate automatically."
      structuredData={
        <CoreStructuredData
          scriptKeyPrefix="categories"
          webPage={{ path: CATEGORIES_PATH, name: PAGE_TITLE }}
          breadcrumbs={{
            items: [
              { name: "Home", path: HOME_PATH },
              { name: PAGE_TITLE, path: CATEGORIES_PATH },
            ],
          }}
        />
      }
    />
  )
}
