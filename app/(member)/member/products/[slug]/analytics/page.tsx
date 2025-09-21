import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { hasPlanFeature } from "@/lib/features"
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

  const product = await prisma.product.findUnique({
    where: { id: manageableProduct.id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      websiteUrl: true,
      category: { select: { name: true } },
      analytics: { select: { upvotes: true, clicks: true } },
      plan: {
        select: {
          name: true,
          price: true,
          assignments: {
            select: {
              enabled: true,
              feature: { select: { key: true } },
            },
          },
        },
      },
    },
  })

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
      basePath="member/products"
      backHref={`/member/products/${product.slug}`}
      publicHref={publicPath}
      headingId={product.slug}
      headingSlug={product.id}
      accessLevel={accessLevel}
    />
  )
}
