import { notFound } from "next/navigation"

import { getProductInsightProfile } from "@/actions/member/products/insights"
import { ProductInsightsView } from "@/components/pages/ProductInsightsView"

export default async function ProductInsightsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProductInsightProfile(slug).catch((error) => {
    console.error("[product-insights] failed to load profile", error)
    return null
  })

  if (!product) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      <ProductInsightsView
        slug={product.slug}
        productName={product.name}
        websiteUrl={product.websiteUrl}
        initialProfile={product.insightProfile}
      />
    </div>
  )
}
