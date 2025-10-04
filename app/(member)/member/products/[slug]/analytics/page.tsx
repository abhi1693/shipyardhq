import { notFound, redirect } from "next/navigation"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { getProductAnalyticsNarrative } from "@/lib/server/analytics/productAnalyticsNarrative"
import { hasPlanFeature } from "@/lib/features"
import {
  MEMBER_PRODUCTS_PATH,
  memberProductPath,
  productPath,
} from "@/lib/routes"
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

  const entitlementFeatures = new Set(
    (product.featureEntitlements ?? [])
      .filter((ent) => ent.status === "active" || ent.status === "pending")
      .map((ent) => ent.featureKey),
  )

  const hasAdvancedAnalytics =
    hasPlanFeature(product.plan ?? null, "analytics.advanced") ||
    entitlementFeatures.has("analytics.advanced")

  const hasBasicAnalytics =
    hasAdvancedAnalytics ||
    hasPlanFeature(product.plan ?? null, "analytics.basic") ||
    entitlementFeatures.has("analytics.basic")
  const accessLevel = hasAdvancedAnalytics ? "advanced" : "basic"

  if (!hasBasicAnalytics) {
    redirect(memberProductPath(product.slug))
  }

  const summary = await getProductTrafficSummary(product.id, {
    rangeDays,
    includeAdvanced: hasAdvancedAnalytics,
  })
  const publicPath = productPath(product.slug)
  const narrative = await getProductAnalyticsNarrative(
    product.id,
    product.name,
    summary,
  )

  const viewProduct = toProductAnalyticsViewProduct(product)

  return (
    <ProductAnalyticsView
      product={viewProduct}
      summary={summary}
      narrative={narrative}
      basePath={MEMBER_PRODUCTS_PATH.slice(1)}
      backHref={memberProductPath(product.slug)}
      publicHref={publicPath}
      headingId={product.slug}
      headingSlug={product.id}
      accessLevel={accessLevel}
    />
  )
}
