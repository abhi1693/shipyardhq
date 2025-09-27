import { notFound } from "next/navigation"

import { getProductIdeaProfile } from "@/actions/member/products/ideas"
import { ProductIdeasView } from "@/components/pages/ProductIdeasView"

export default async function ProductIdeasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProductIdeaProfile(slug).catch((error) => {
    console.error("[product-ideas] failed to load profile", error)
    return null
  })

  if (!product) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      <ProductIdeasView
        slug={product.slug}
        productName={product.name}
        websiteUrl={product.websiteUrl}
        initialProfile={product.ideaProfile}
      />
    </div>
  )
}
