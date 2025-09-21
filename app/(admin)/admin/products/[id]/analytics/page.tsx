import { notFound } from "next/navigation"

import prisma from "@/lib/prisma"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
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

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      analytics: { select: { upvotes: true, clicks: true } },
    },
  })

  if (!product) {
    return notFound()
  }

  const summary = await getProductTrafficSummary(product.id, {
    rangeDays,
    includeAdvanced: true,
  })
  const publicPath = `/products/${product.slug}`

  return (
    <ProductAnalyticsView
      product={{
        id: product.id,
        slug: product.slug,
        name: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        analytics: product.analytics,
      }}
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
