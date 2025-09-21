import { notFound } from "next/navigation"

import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import {
  getProductAnalyticsRecord,
  toProductAnalyticsViewProduct,
} from "@/lib/server/analytics/productAnalytics"
import {
  ProductAnalyticsView,
  rangeToDays,
} from "@/components/pages/ProductAnalyticsView"

export default async function AdminProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const rangeParam = sp?.range ?? null
  const rangeDays = rangeToDays(rangeParam)

  const product = await getProductAnalyticsRecord(id)

  if (!product) {
    return notFound()
  }

  const summary = await getProductTrafficSummary(product.id, {
    rangeDays,
    includeAdvanced: true,
  })
  const publicPath = `/products/${product.slug}`

  const viewProduct = toProductAnalyticsViewProduct(product)

  return (
    <ProductAnalyticsView
      product={viewProduct}
      summary={summary}
      basePath="admin/products"
      backHref={`/admin/products/${product.id}`}
      publicHref={publicPath}
      headingId={product.id}
      headingSlug={product.slug}
      accessLevel="advanced"
    />
  )
}
