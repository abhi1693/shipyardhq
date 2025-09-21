import { notFound, redirect } from "next/navigation"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { hasPlanFeature } from "@/lib/features"
import {
  getProductAnalyticsRecord,
  toProductAnalyticsViewProduct,
} from "@/lib/server/analytics/productAnalytics"
import {
  ProductAnalyticsView,
  rangeToDays,
} from "@/components/pages/ProductAnalyticsView"
export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const rangeParam = sp?.range ?? null
  const rangeDays = rangeToDays(rangeParam)
  const { product: manageableProduct } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const product = await getProductAnalyticsRecord(manageableProduct.id)

  if (!product) {
    return notFound()
  }

  const hasAdvancedAnalytics = hasPlanFeature(
    product.plan ?? null,
    "analytics.advanced",
  )
  const hasBasicAnalytics =
    hasAdvancedAnalytics ||
    hasPlanFeature(product.plan ?? null, "analytics.basic")
  const accessLevel = hasAdvancedAnalytics ? "advanced" : "basic"

  if (!hasBasicAnalytics) {
    redirect(`/member/products/${product.slug}`)
  }

  const summary = await getProductTrafficSummary(product.id, {
    rangeDays,
    includeAdvanced: hasAdvancedAnalytics,
  })
  const publicPath = `/products/${product.slug}`

  const viewProduct = toProductAnalyticsViewProduct(product)

  return (
    <ProductAnalyticsView
      product={viewProduct}
      summary={summary}
      basePath="member/products"
      backHref={`/member/products/${product.slug}`}
      publicHref={publicPath}
      headingId={product.slug}
      headingSlug={product.id}
      accessLevel={accessLevel}
    />
  )
}
