import { getCategoryMeta } from "@/actions/public/categories/actions"
import { getCategoryDetailPayload } from "@/lib/categories/page-cache"
import { getPlatformMeta } from "@/lib/platforms/config"
import { getPricingModelMeta } from "@/lib/pricing/models"
import { getProductTypeMeta } from "@/lib/product-types/models"
import {
  getProductSlicePayload,
  type ProductSliceFilters,
} from "@/lib/pseo/product-slices"
import {
  categoryPath,
  categoryPlatformPath,
  categoryPricingPath,
  categoryProductTypePath,
} from "@/lib/routes"
import { buildDirectoryMarkdownDocument } from "@/lib/server/directoryMarkdownDocument"

async function renderCategoryMarkdown(slug: string) {
  const payload = await getCategoryDetailPayload(slug)
  if (!payload) return null

  const { category, productsPage, metrics } = payload
  const title = `${category.name} Products`
  const description = category.description?.trim()
    ? `${category.description.trim()} This Shipyard category page lists public launches, makers, verification signals, upvotes, and promoted placements for ${category.name.toLowerCase()} products.`
    : `Shipyard lists launch-ready ${category.name.toLowerCase()} products from makers shipping apps, SaaS tools, APIs, and startup software.`

  return buildDirectoryMarkdownDocument({
    title,
    canonicalPath: categoryPath(category.slug ?? slug),
    description,
    total: productsPage.total,
    facts: [
      `Category: ${category.name}`,
      `Featured or priority products: ${metrics.totalFeatured + metrics.totalPriority}`,
      `Latest launch: ${metrics.latestLaunchName ?? "None"}`,
      metrics.latestLaunchDate
        ? `Latest launch date: ${metrics.latestLaunchDate}`
        : "",
      `Total upvotes: ${metrics.totalUpvotes}`,
    ],
    products: productsPage.products,
  })
}

async function renderCategorySliceMarkdown({
  categorySlug,
  segment,
  valueSlug,
}: {
  categorySlug: string
  segment: "pricing" | "platforms" | "product-types"
  valueSlug: string
}) {
  const category = await getCategoryMeta(categorySlug)
  if (!category) return null

  let label: string
  let description: string
  let canonicalPath: string
  let filters: ProductSliceFilters

  if (segment === "pricing") {
    const meta = getPricingModelMeta(valueSlug)
    if (!meta) return null
    label = meta.label
    description = `${meta.label} ${category.name} products on Shipyard are filtered by category and pricing model for buyers and researchers comparing launch-ready tools. ${meta.description}`
    canonicalPath = categoryPricingPath(categorySlug, meta.slug)
    filters = { categorySlug, pricingModel: meta.value }
  } else if (segment === "platforms") {
    const meta = getPlatformMeta(valueSlug)
    if (!meta) return null
    label = meta.label
    description = `${meta.label} ${category.name} products on Shipyard are filtered by category and supported platform. ${meta.description}`
    canonicalPath = categoryPlatformPath(categorySlug, meta.slug)
    filters = { categorySlug, platform: meta.value }
  } else {
    const meta = getProductTypeMeta(valueSlug)
    if (!meta) return null
    label = meta.label
    description = `${meta.label} ${category.name} products on Shipyard are filtered by category and product type. ${meta.description}`
    canonicalPath = categoryProductTypePath(categorySlug, meta.slug)
    filters = { categorySlug, productType: meta.value }
  }

  const payload = await getProductSlicePayload({
    filters,
    parsed: { sort: "new", page: 1, verified: false },
  })

  return buildDirectoryMarkdownDocument({
    title: `${label} ${category.name} Products`,
    canonicalPath,
    description,
    total: payload.total,
    facts: [
      `Category: ${category.name}`,
      `Filter: ${label}`,
      `Filter type: ${segment}`,
      "Default sort: newest",
    ],
    products: payload.products,
  })
}

export async function renderDirectoryMarkdownForPath(pathname: string) {
  const categoryMatch = pathname.match(/^\/categories\/([^/]+)\/?$/)
  if (categoryMatch?.[1]) {
    return renderCategoryMarkdown(decodeURIComponent(categoryMatch[1]))
  }

  const categorySliceMatch = pathname.match(
    /^\/categories\/([^/]+)\/(pricing|platforms|product-types)\/([^/]+)\/?$/,
  )
  if (
    categorySliceMatch?.[1] &&
    categorySliceMatch[2] &&
    categorySliceMatch[3]
  ) {
    return renderCategorySliceMarkdown({
      categorySlug: decodeURIComponent(categorySliceMatch[1]),
      segment: categorySliceMatch[2] as
        "pricing" | "platforms" | "product-types",
      valueSlug: decodeURIComponent(categorySliceMatch[3]),
    })
  }

  return null
}
