import { notFound } from "next/navigation"

import { getAdminProductInsightProfile } from "@/actions/admin/products/insights"
import { ProductInsightsView } from "@/components/pages/ProductInsightsView"

export default async function AdminProductInsightsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const product = await getAdminProductInsightProfile(id).catch((error) => {
    console.error("[admin:product-insights] failed to load profile", error)
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
        accessLevel="admin"
      />
    </div>
  )
}
