import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { requireManageableProduct } from "@/lib/server/productAccess"
import {
  MEMBER_PRODUCTS_PATH,
  memberProductPath,
  productPath,
} from "@/lib/routes"
import {
  getProductAnalyticsRecord,
  resolveProductAnalyticsAccess,
  toProductAnalyticsViewProduct,
} from "@/lib/server/analytics/productAnalytics"
import {
  ProductAnalyticsView,
  rangeToDays,
} from "@/components/pages/ProductAnalyticsView"
import { ProductAnalyticsSkeleton } from "@/components/pages/ProductAnalyticsSkeleton"
import { getProductTrafficSummary } from "@/lib/server/analytics/productTrafficSummary"
import { getProductAnalyticsNarrative } from "@/lib/server/analytics/productAnalyticsNarrative"

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

  const { hasAdvancedAnalytics, hasBasicAnalytics } =
    resolveProductAnalyticsAccess(product)
  const accessLevel = hasAdvancedAnalytics ? "advanced" : "basic"

  if (!hasBasicAnalytics) {
    redirect(memberProductPath(product.slug))
  }

  const publicPath = productPath(product.slug)
  const viewProduct = toProductAnalyticsViewProduct(product)

  return (
    <Suspense
      fallback={
        <ProductAnalyticsSkeleton
          product={viewProduct}
          basePath={MEMBER_PRODUCTS_PATH.slice(1)}
          backHref={memberProductPath(product.slug)}
          publicHref={publicPath}
          headingId={product.slug}
          headingSlug={product.id}
          accessLevel={accessLevel}
          rangeDays={rangeDays}
        />
      }
    >
      <AnalyticsContent
        product={viewProduct}
        productId={product.id}
        productName={product.name}
        accessLevel={accessLevel}
        includeAdvanced={hasAdvancedAnalytics}
        rangeDays={rangeDays}
        basePath={MEMBER_PRODUCTS_PATH.slice(1)}
        backHref={memberProductPath(product.slug)}
        publicHref={publicPath}
        headingId={product.slug}
        headingSlug={product.id}
      />
    </Suspense>
  )
}

type AnalyticsContentProps = {
  product: Parameters<typeof ProductAnalyticsView>[0]["product"]
  productId: string
  productName: string
  accessLevel: Parameters<typeof ProductAnalyticsView>[0]["accessLevel"]
  includeAdvanced: boolean
  rangeDays: number
  basePath: string
  backHref: string
  publicHref?: string
  headingId: string
  headingSlug: string
}

async function AnalyticsContent({
  product,
  productId,
  productName,
  accessLevel,
  includeAdvanced,
  rangeDays,
  basePath,
  backHref,
  publicHref,
  headingId,
  headingSlug,
}: AnalyticsContentProps) {
  const summary = await getProductTrafficSummary(productId, {
    rangeDays,
    includeAdvanced,
  })

  const narrative = includeAdvanced
    ? await getProductAnalyticsNarrative(productId, productName, summary)
    : null

  return (
    <ProductAnalyticsView
      product={product}
      summary={summary}
      narrative={narrative}
      basePath={basePath}
      backHref={backHref}
      publicHref={publicHref}
      headingId={headingId}
      headingSlug={headingSlug}
      accessLevel={accessLevel}
    />
  )
}
