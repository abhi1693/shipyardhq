import { notFound } from "next/navigation"
import { getCategories } from "@/actions/admin/categories/actions"
import EditProductForm from "./form"
import { getProductById } from "@/actions/admin/products/actions"
import { getMyOrganizations } from "@/actions/member/organizations/actions"
import { memberHasFeature } from "@/lib/memberFeatures"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { getAlternativeProducts } from "@/actions/admin/alternative-products/actions"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { product: summary } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const product = await getProductById(summary.id)
  if (!product) return notFound()

  const [categories, organizations, alternatives] = await Promise.all([
    getCategories({ orderBy: { name: "asc" } }),
    getMyOrganizations().catch(() => []),
    getAlternativeProducts({
      select: { id: true, slug: true, name: true, websiteUrl: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
  ])

  const canEditCTA = await memberHasFeature("customCTA")

  return (
    <EditProductForm
      product={product}
      categories={categories}
      organizations={organizations}
      canEditCTA={canEditCTA}
      alternatives={alternatives}
    />
  )
}
